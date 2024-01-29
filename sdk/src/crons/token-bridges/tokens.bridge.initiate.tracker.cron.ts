import { CronJob } from 'cron';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SupportedChainId } from 'config/constants/chains';
import { getNativeChainBaseRPCUrl } from 'utils/getRpcUrl';
import { ethers } from 'ethers';
import { CatRelayer__factory } from 'config/abi/types';
import { getCATRelayerAddress } from 'utils/addressHelpers';
import {
  BlockchainListener,
  BlockchainListenerDocument,
} from 'entities/blockchain.listener.entity';
import {
  TokenInfo,
  TokenInfoDocument,
} from 'entities/tokens/token.info.entity';
import {
  TokenNetworks,
  TokenNetworksDocument,
} from 'entities/tokens/token.networks.entity';
import {
  TokenBridgeHistory,
  TokenBridgeHistoryDocument,
  TokenBridgeStatus,
} from '../../entities/tokens/token.bridge.history.entity';
interface ISupportedChains {
  chainId: SupportedChainId;
  initialBlock: number;
}
@Injectable()
export class TokensBridgeInitiateTrackerCronJobService
  implements OnApplicationBootstrap
{
  private isCronRunning = false; // for cron status
  private tokenBridgeChains: ISupportedChains[];
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
      'In Constructor of TokensBridgeCronJobService Cron Job Service',
    );
    this.tokenBridgeChains =
      process.env.IS_MAINNET === '1'
        ? [
            {
              chainId: SupportedChainId.OPTIMISM,
              initialBlock: 112758166,
            },
            {
              chainId: SupportedChainId.BINANCE,
              initialBlock: 33867653,
            },
            {
              chainId: SupportedChainId.ETHEREUM,
              initialBlock: 18665156,
            },
            {
              chainId: SupportedChainId.POLYGON,
              initialBlock: 50464591,
            },
            {
              chainId: SupportedChainId.FANTOM,
              initialBlock: 71624213,
            },
            {
              chainId: SupportedChainId.AVAX,
              initialBlock: 38321803,
            },
            {
              chainId: SupportedChainId.ARBITRUM,
              initialBlock: 154692521,
            },
          ]
        : [
            {
              chainId: SupportedChainId.BSC_TESTNET,
              initialBlock: 29675331,
            },
            {
              chainId: SupportedChainId.FUJI,
              initialBlock: 21762060,
            },
            {
              chainId: SupportedChainId.POLYGON_MUMBAI,
              initialBlock: 35418410,
            },
            {
              chainId: SupportedChainId.FANTOM_TESTNET,
              initialBlock: 15468120,
            },
            {
              chainId: SupportedChainId.GOERLI,
              initialBlock: 8975484,
            },
            {
              chainId: SupportedChainId.ARBITRUM_GOERLI,
              initialBlock: 19300323,
            },
          ];
  }

  /**
   * Start application bootstrap callback from nestjs
   */
  async onApplicationBootstrap() {
    console.log('OnApplicationBootstrap in cron');
    this.startCronJob().start();
  } // end of application bootstrap

  startCronJob(): CronJob {
    // after every hour
    return new CronJob('0 */3 * * * *', async () => {
      if (!this.isCronRunning) {
        this.isCronRunning = true;
        console.log('Running inside Token bridge Init');
        for (const tokenBridgeChain of this.tokenBridgeChains) {
          const chain = tokenBridgeChain.chainId;
          const catRelayerAddress = getCATRelayerAddress(chain);
          const symbol = `CAT-${chain}-${catRelayerAddress}-TOKEN-BRIDGE`;
          try {
            const rpc = getNativeChainBaseRPCUrl(chain);
            const provider = new ethers.providers.JsonRpcProvider(rpc);

            const catRelayerContract = await CatRelayer__factory.connect(
              catRelayerAddress,
              provider,
            );

            let blockchainInfo = await this.BlockchainListenerModel.findOne({
              symbol,
            });

            const startBlock = blockchainInfo
              ? Number(blockchainInfo.block_no) + 1
              : tokenBridgeChain.initialBlock; //

            const latestBlock = await provider.getBlockNumber();

            let endBlock = startBlock + 1000;
            if (endBlock > latestBlock) {
              endBlock = latestBlock;
            }

            if (startBlock > endBlock) {
              this.isCronRunning = false;
              return;
            }

            const eventFilter = catRelayerContract.filters.InitiatedBridgeOut();

            const events = await catRelayerContract.queryFilter(
              eventFilter,
              startBlock,
              endBlock,
            );

            const eventFilterForProxyBridgeOut =
              catRelayerContract.filters.InitiatedProxyBridgeOut();

            const eventsProxyBridgeOut = await catRelayerContract.queryFilter(
              eventFilterForProxyBridgeOut,
              startBlock,
              endBlock,
            );
            console.log(
              'Events for Token Bridged -> ',
              events.length,
              eventsProxyBridgeOut.length,
              startBlock,
              endBlock,
              chain,
            );

            for (const eventForBridgeOut of events) {
              const transactionDetail =
                await eventForBridgeOut.getTransaction();

              const { args } = eventForBridgeOut;
              const bridgingDetail =
                await this.TokenBridgeHistoryModel.findById(
                  args.trackId,
                ).lean();
              if (!bridgingDetail) {
                console.info(
                  'No bridging detail found for trackId',
                  args.trackId,
                );
                continue;
              } // end of if

              if (
                bridgingDetail.status === TokenBridgeStatus.BRIDGE_COMPLETED
              ) {
                console.info(
                  'Bridging already completed for trackId',
                  args.trackId,
                );
                continue;
              } // end of if

              if (
                bridgingDetail.relayerBridgeFeeInWei !==
                args.gasValue.toString()
              ) {
                console.info('Bridging fee mismatch for trackId', args.trackId);
                continue;
              } // end of if

              await this.TokenBridgeHistoryModel.findOneAndUpdate(
                {
                  _id: args.trackId,
                },
                {
                  status: TokenBridgeStatus.BRIDGE_INITIATED,
                  initiateBridgeTxHash: transactionDetail.hash,
                  updated_at: new Date(),
                },
              );
            } // end of loop for events

            // loop for proxy bridge out
            for (const eventForProxyBridgeOut of eventsProxyBridgeOut) {
              const transactionDetail =
                await eventForProxyBridgeOut.getTransaction();

              const { args } = eventForProxyBridgeOut;
              const bridgingDetail =
                await this.TokenBridgeHistoryModel.findById(
                  args.trackId,
                ).lean();
              if (!bridgingDetail) {
                console.info(
                  'No bridging detail found for trackId',
                  args.trackId,
                );
                continue;
              } // end of if

              if (
                bridgingDetail.status === TokenBridgeStatus.BRIDGE_COMPLETED
              ) {
                console.info(
                  'Bridging already completed for trackId',
                  args.trackId,
                );
                continue;
              } // end of if

              if (
                bridgingDetail.relayerBridgeFeeInWei !==
                args.gasValue.toString()
              ) {
                console.info('Bridging fee mismatch for trackId', args.trackId);
                continue;
              } // end of if

              await this.TokenBridgeHistoryModel.findOneAndUpdate(
                {
                  _id: args.trackId,
                },
                {
                  status: TokenBridgeStatus.BRIDGE_INITIATED,
                  initiateBridgeTxHash: transactionDetail.hash,
                  updated_at: new Date(),
                },
              );
            } // end of second loop of proxy bridge out
            if (!blockchainInfo) {
              blockchainInfo = new this.BlockchainListenerModel();
              blockchainInfo.symbol = symbol;
              blockchainInfo.created_at = new Date();
            }
            blockchainInfo.block_no = endBlock;
            blockchainInfo.updated_at = new Date();
            await blockchainInfo.save();
          } catch (error) {
            console.log('Error in TokensBridgeCronJobService cron', error);
          }
        } // end of for loop

        this.isCronRunning = false;
      } // end of if for cron running check
    }); // end of cron
  } // end of function for creating cron
} // end of class
