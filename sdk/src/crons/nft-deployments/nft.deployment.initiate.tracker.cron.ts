// this file is tracking the token deployment event from the CAT relayer contract and will update the token network status so other cron will deploy token.
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
import { TokenNetworkDeployStatus } from 'entities/tokens/token.networks.entity';
import { decodeParameters } from 'utils';
import { NFTInfo, NFTInfoDocument } from '../../entities/nfts/nft.info.entity';
import {
  NFTNetworks,
  NFTNetworksDocument,
} from '../../entities/nfts/nft.networks.entity';

interface ITokenInitiateDeploymentChain {
  chainId: SupportedChainId;
  initialBlock: number;
}
@Injectable()
export class NFTDeploymentInitiateEventTrackerCronJobService
  implements OnApplicationBootstrap
{
  private isCronRunning = false; // for cron status
  private nftDeploymentChains: ITokenInitiateDeploymentChain[];

  private randomCollectionThumbnail: string[];
  constructor(
    @InjectModel(BlockchainListener.name)
    private BlockchainListenerModel: Model<BlockchainListenerDocument>,
    @InjectModel(NFTInfo.name)
    private NFTInfoModel: Model<NFTInfoDocument>,
    @InjectModel(NFTNetworks.name)
    private NFTNetworksModel: Model<NFTNetworksDocument>,
  ) {
    console.log(
      'In Constructor of TokensDeploymentEventTrackerCronJobService Cron Job Service',
    );
    this.nftDeploymentChains =
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

    this.randomCollectionThumbnail = [
      `https://test-sdk.nexa.network/1.avif`,
      `https://test-sdk.nexa.network/2.avif`,
      `https://test-sdk.nexa.network/3.avif`,
      `https://test-sdk.nexa.network/4.avif`,
      `https://test-sdk.nexa.network/5.avif`,
      `https://test-sdk.nexa.network/6.avif`,
      `https://test-sdk.nexa.network/7.avif`,
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
    // after every minute
    return new CronJob('0 */3  * * * *', async () => {
      if (!this.isCronRunning) {
        this.isCronRunning = true;
        console.log(
          'Running inside NFTDeploymentInitiateEventTrackerCronJobService Rate Cron JOb',
        );

        for (const nftDeploymentChain of this.nftDeploymentChains) {
          const chain = nftDeploymentChain.chainId;
          const catRelayerAddress = getCATRelayerAddress(chain);
          const symbol = `CAT-${chain}-${catRelayerAddress}-INITIATE-NFT-DEPLOYMENT`;
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
              : nftDeploymentChain.initialBlock; //

            const latestBlock = await provider.getBlockNumber();

            let endBlock = startBlock + 1000;
            if (endBlock > latestBlock) {
              endBlock = latestBlock;
            }
            if (startBlock > endBlock) {
              this.isCronRunning = false;
              return;
            }
            const eventFilter =
              catRelayerContract.filters.InitiateNFTDeployment();

            const events = await catRelayerContract.queryFilter(
              eventFilter,
              startBlock,
              endBlock,
            );

            console.log(
              'Events for Initiate NFT Deployment -> ',
              events.length,
              startBlock,
              endBlock,
            );

            for (const event of events) {
              const transactionDetail = await event.getTransaction();
              const [name, symbol, baseUrl, totalSupply, salt, owner] =
                decodeParameters(
                  [
                    'string',
                    'string',
                    'string',
                    'uint256',
                    'bytes32',
                    'address',
                  ],
                  event.args.params,
                );

              const nftInfo = await this.NFTInfoModel.findOne({
                salt,
              }).lean();

              if (!nftInfo) {
                console.log('No NFT info found for salt -> ', salt);
                continue;
              }

              // here first we verify the fee transfer and same chains is same as in our queries table.
              const destinationChainInEventArgs =
                event.args.destinationChains.map((chainObj) =>
                  chainObj.toNumber(),
                );
              if (
                +ethers.utils.formatEther(
                  transactionDetail.value.toString(),
                ) !== nftInfo.totalGasFeeOnFeePaymentChain
                // &&
                // destinationChainInEventArgs ===
                //   tokenDeployQuery.destinationChains
              ) {
                console.log(
                  'Fee is not same in transaction as in query so skipping this event',
                );
                //: TODO for fee we need to implement security
              }
              // as fee is matched what we calculated, so we are moving to next step for update the token network info in tables and then other cron will be deploying the token.

              const randomImageForCollection = Math.floor(
                Math.random() * this.randomCollectionThumbnail.length,
              ); // 0 -> length

              await this.NFTInfoModel.findOneAndUpdate(
                {
                  _id: nftInfo._id,
                },
                {
                  imageUrl:
                    this.randomCollectionThumbnail[randomImageForCollection],
                },
              );
              // as token info save now we are going to save token networks.
              let indexForGasValues = 0;
              for (const destinationChain of destinationChainInEventArgs) {
                await this.NFTNetworksModel.findOneAndUpdate(
                  {
                    nftInfo: nftInfo._id,
                    chainId: destinationChain,
                    status: TokenNetworkDeployStatus.QUERIED,
                  },
                  {
                    status: TokenNetworkDeployStatus.PENDING,
                    feePaidByUser:
                      event.args.gasValues[indexForGasValues].toString(),
                  },
                );
                indexForGasValues++;
              }
            } // end of events loop.

            if (!blockchainInfo) {
              blockchainInfo = new this.BlockchainListenerModel();
              blockchainInfo.symbol = symbol;
              blockchainInfo.created_at = new Date();
            }
            blockchainInfo.block_no = endBlock;
            blockchainInfo.updated_at = new Date();
            await blockchainInfo.save();
          } catch (err) {
            console.log('inside catch of events fetch', err, chain);
          }
        } // end of loop for supported chains

        this.isCronRunning = false;
      } // end of if for cron running check
    }); // end of cron
  } // end of function for creating cron
} // end of class
