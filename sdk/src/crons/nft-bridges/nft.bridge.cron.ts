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
import { CatERC721__factory } from 'config/abi/types';
import { getWordholeBridgeAddress } from 'utils/addressHelpers';
import { TokenBridgeStatus } from '../../entities/tokens/token.bridge.history.entity';
import {
  getEmitterAddressEth,
  parseSequenceFromLogEth,
  uint8ArrayToHex,
} from '@certusone/wormhole-sdk';
import { getSignedVAAWithRetry } from '../../utils/getSignedVAAWithRetry';
import { NFTInfo, NFTInfoDocument } from '../../entities/nfts/nft.info.entity';
import {
  NFTNetworks,
  NFTNetworksDocument,
} from '../../entities/nfts/nft.networks.entity';
import {
  NFTBridgeHistory,
  NFTBridgeHistoryDocument,
} from '../../entities/nfts/nft.bridge.history.entity';

@Injectable()
export class NFTBridgeCronJobService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(NFTInfo.name)
    private NFTInfoModel: Model<NFTInfoDocument>,
    @InjectModel(NFTNetworks.name)
    private NFTNetworksModel: Model<NFTNetworksDocument>,
    @InjectModel(NFTBridgeHistory.name)
    private NFTBridgeHistoryModel: Model<NFTBridgeHistoryDocument>,
  ) {
    console.log(
      'In Constructor of NFTBridgeCronJobService Cron Job Service Constructor',
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
      await this.NFTBridgeHistoryModel.updateMany(
        {
          status: TokenBridgeStatus.BRIDGE_ERROR,
        },
        {
          $set: { status: TokenBridgeStatus.BRIDGE_INITIATED },
        },
      );

    const pendingTokenBridges = await this.NFTBridgeHistoryModel.find({
      status: TokenBridgeStatus.BRIDGE_INITIATED,
    }).lean();

    console.log(
      ' IN NFT pendingTokenBridges Cron => ',
      pendingTokenBridges.length,
    );
    for (const pendingBridgeTx of pendingTokenBridges) {
      try {
        await this.NFTBridgeHistoryModel.findOneAndUpdate(
          {
            _id: pendingBridgeTx._id,
          },
          {
            status: TokenBridgeStatus.IN_QUEUE,
            updatedAt: new Date(),
          },
        );
        const rpc = getNativeChainBaseRPCUrl(pendingBridgeTx.fromChainId);
        const provider = new ethers.providers.JsonRpcProvider(rpc);

        const bridgeInitiatedTxRecept = await provider.getTransactionReceipt(
          pendingBridgeTx.initiateBridgeTxHash,
        );

        const sequence = parseSequenceFromLogEth(
          bridgeInitiatedTxRecept,
          getWordholeBridgeAddress(pendingBridgeTx.fromChainId),
        );

        console.log('sequence', sequence);
        let emitterAddress = getEmitterAddressEth(pendingBridgeTx.fromToken);

        const genericTokenInfo = await this.NFTNetworksModel.findOne({
          genericTokenAddress: {
            $regex: new RegExp(pendingBridgeTx.fromToken, 'i'),
          },
          address: { $ne: null },
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

        const catContract = CatERC721__factory.connect(
          pendingBridgeTx.toToken,
          wallet,
        );

        const tx = await catContract.bridgeIn(vaaBytes);

        const contractRecipient = await tx.wait();
        console.log(contractRecipient);
        await this.NFTBridgeHistoryModel.findOneAndUpdate(
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
        if (pendingBridgeTx.errorRetryCount <= 3) {
          status = TokenBridgeStatus.BRIDGE_INITIATED;
        }

        console.error('error in cron For Token Bridge', error);
        await this.NFTBridgeHistoryModel.findOneAndUpdate(
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
