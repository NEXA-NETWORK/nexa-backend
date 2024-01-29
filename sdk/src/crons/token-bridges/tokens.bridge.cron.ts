import { CronJob } from 'cron';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import {
  SupportedChainId,
  WORMHOLE_CHAIN_ID_FROM_NATIVE,
} from 'config/constants/chains';
import { getNativeChainBaseRPCUrl } from 'utils/getRpcUrl';
import { ethers } from 'ethers';
import { CatRelayer__factory, CatErc20__factory } from 'config/abi/types';
import {
  getCATRelayerAddress,
  getWordholeBridgeAddress,
} from 'utils/addressHelpers';
import {
  BlockchainListener,
  BlockchainListenerDocument,
} from 'entities/blockchain.listener.entity';
import {
  TokenInfo,
  TokenInfoDocument,
} from 'entities/tokens/token.info.entity';
import {
  TokenNetworkDeployStatus,
  TokenNetworks,
  TokenNetworksDocument,
} from 'entities/tokens/token.networks.entity';
import {
  TokenBridgeHistory,
  TokenBridgeHistoryDocument,
  TokenBridgeStatus,
} from '../../entities/tokens/token.bridge.history.entity';
import {
  getEmitterAddressEth,
  parseSequenceFromLogEth,
  uint8ArrayToHex,
} from '@certusone/wormhole-sdk';
import { getSignedVAAWithRetry } from '../../utils/getSignedVAAWithRetry';
import { enhanceGasMargin } from '../../utils';
import { getBlockConfirmationForVAA } from '../../config/constants';

@Injectable()
export class TokensBridgeCronJobService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(BlockchainListener.name)
    private BlockchainListenerModel: Model<BlockchainListenerDocument>,
    @InjectModel(TokenInfo.name)
    private TokenInfoModel: Model<TokenInfoDocument>,
    @InjectModel(TokenNetworks.name)
    private TokenNetworksModel: Model<TokenNetworksDocument>,
    @InjectModel(TokenBridgeHistory.name)
    private TokenBridgeHistoryModel: Model<TokenBridgeHistoryDocument>,
  ) {
    console.log(
      'In Constructor of TokensBridgeCronJobService Cron Job Service Constructor',
    );
  }

  /**
   * Start application bootstrap callback from nestjs
   */
  async onApplicationBootstrap() {
    console.log('OnApplicationBootstrap in cron');
  } // end of application bootstrap

  async execute() {
    console.log('Running inside TokensBridgeCronJobService');

    const failedBridgeForDeployment =
      await this.TokenBridgeHistoryModel.updateMany(
        {
          status: TokenBridgeStatus.BRIDGE_ERROR,
        },
        {
          $set: { status: TokenBridgeStatus.BRIDGE_INITIATED },
        },
      );

    const pendingTokenBridges = await this.TokenBridgeHistoryModel.find({
      $or: [
        {
          status: TokenBridgeStatus.BRIDGE_INITIATED,
        },
        {
          status: TokenBridgeStatus.BLOCK_CONFIRMATION,
        },
      ],
    }).lean();

    console.log(
      ' IN Token pendingTokenBridges Cron => ',
      pendingTokenBridges.length,
    );
    for (const pendingBridgeTx of pendingTokenBridges) {
      try {
        const rpc = getNativeChainBaseRPCUrl(pendingBridgeTx.fromChainId);
        const provider = new ethers.providers.JsonRpcProvider(rpc);

        const bridgeInitiatedTxRecept = await provider.getTransactionReceipt(
          pendingBridgeTx.initiateBridgeTxHash,
        );

        const currentBlockNumber = await provider.getBlockNumber();

        const blockNumberDiff = getBlockConfirmationForVAA(
          pendingBridgeTx.fromChainId,
        );

        if (
          currentBlockNumber - bridgeInitiatedTxRecept.blockNumber <
          blockNumberDiff
        ) {
          console.log(
            'Block confirmation not reached yet For Token Bridge of ',
            pendingBridgeTx._id,
            blockNumberDiff,
            currentBlockNumber - bridgeInitiatedTxRecept.blockNumber,
          );

          await this.TokenBridgeHistoryModel.findOneAndUpdate(
            {
              _id: pendingBridgeTx._id,
            },
            {
              status: TokenBridgeStatus.BLOCK_CONFIRMATION,
              totalBlockConfirmation: blockNumberDiff,
              blockConfirmationDone:
                currentBlockNumber - bridgeInitiatedTxRecept.blockNumber,
              updatedAt: new Date(),
            },
          );
          continue;
        } // end of if for block confirmation
        const sequence = parseSequenceFromLogEth(
          bridgeInitiatedTxRecept,
          getWordholeBridgeAddress(pendingBridgeTx.fromChainId),
        );

        await this.TokenBridgeHistoryModel.findOneAndUpdate(
          {
            _id: pendingBridgeTx._id,
          },
          {
            status: TokenBridgeStatus.IN_QUEUE,
            totalBlockConfirmation: blockNumberDiff,
            blockConfirmationDone:
              currentBlockNumber - bridgeInitiatedTxRecept.blockNumber,
            updatedAt: new Date(),
          },
        );
        console.log('sequence', sequence);
        let emitterAddress = getEmitterAddressEth(pendingBridgeTx.fromToken);

        const genericTokenInfo = await this.TokenNetworksModel.findOne({
          genericTokenAddress: {
            $regex: new RegExp(pendingBridgeTx.fromToken, 'i'),
          },
          address: { $ne: null },
          chainId: pendingBridgeTx.fromChainId,
        }).lean();
        if (genericTokenInfo) {
          emitterAddress = getEmitterAddressEth(genericTokenInfo.address);
        }

        const { vaaBytes } = await getSignedVAAWithRetry(
          WORMHOLE_CHAIN_ID_FROM_NATIVE[pendingBridgeTx.fromChainId],
          emitterAddress,
          sequence,
          20,
        );

        const vaaInHex = uint8ArrayToHex(vaaBytes);
        const rpcForToChain = getNativeChainBaseRPCUrl(
          pendingBridgeTx.toChainId,
        );
        const providerForToChain = new ethers.providers.JsonRpcProvider(
          rpcForToChain,
        );
        const wallet = new ethers.Wallet(
          process.env.HOT_WALLET_PRIVATE_KEY,
          providerForToChain,
        );

        const catContract = CatErc20__factory.connect(
          pendingBridgeTx.toToken,
          wallet,
        );
        const gasPrice = await providerForToChain.getGasPrice();

        const enhanceGasPriceForTx = enhanceGasMargin(gasPrice, 10);

        let overrideOptions: any = {
          gasPrice: enhanceGasPriceForTx,
        };

        if (pendingBridgeTx.toChainId === SupportedChainId.ETHEREUM) {
          // const block = await provider.getBlock('latest');
          // overrideOptions['maxFeePerGas'] = block.baseFeePerGas;
          overrideOptions = {};
        }
        console.log(
          '----- HIGH FEE IN BRIDGING -----',
          enhanceGasPriceForTx.toString(),
        );
        const tx = await catContract.bridgeIn(vaaBytes, overrideOptions);

        const contractRecipient = await tx.wait();
        console.log(contractRecipient);
        await this.TokenBridgeHistoryModel.findOneAndUpdate(
          {
            _id: pendingBridgeTx._id,
          },
          {
            status: TokenBridgeStatus.BRIDGE_COMPLETED,
            relayerBridgeTxHash: contractRecipient.transactionHash,
            updatedAt: new Date(),
          },
        );
      } catch (error) {
        let status = TokenBridgeStatus.BRIDGE_ERROR;
        if (
          pendingBridgeTx.errorRetryCount <= 3 ||
          (error.code && error.code === 5)
        ) {
          status = TokenBridgeStatus.BRIDGE_INITIATED;
        }
        console.error('error in cron For Token Bridge', error);
        await this.TokenBridgeHistoryModel.findOneAndUpdate(
          {
            _id: pendingBridgeTx._id,
          },
          {
            status,
            errorRetryCount: pendingBridgeTx.errorRetryCount + 1,
            error: JSON.stringify(error),
            updatedAt: new Date(),
          },
        );
      }
    } // end of loop for token deployment
  } // end of function for creating cron
} // end of class
