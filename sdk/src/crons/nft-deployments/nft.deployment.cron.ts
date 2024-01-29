import { CronJob } from 'cron';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SupportedChainId,
  WORMHOLE_CHAIN_ID_FROM_NATIVE,
} from 'config/constants/chains';
import { getNativeChainBaseRPCUrl } from 'utils/getRpcUrl';
import { ethers } from 'ethers';
import { CatERC721__factory, CatRelayer__factory } from 'config/abi/types';
import { getCATRelayerAddress } from 'utils/addressHelpers';
import {
  BlockchainListener,
  BlockchainListenerDocument,
} from 'entities/blockchain.listener.entity';

import { TokenNetworkDeployStatus } from 'entities/tokens/token.networks.entity';
import { CATType } from '../../config/constants/types';
import { tryNativeToHexString } from '@certusone/wormhole-sdk';
import { CATERC20Structs } from '../../config/abi/types/CatErc20';
import { NFTInfo, NFTInfoDocument } from '../../entities/nfts/nft.info.entity';
import {
  NFTNetworks,
  NFTNetworksDocument,
} from '../../entities/nfts/nft.networks.entity';
import { CATERC721Structs } from '../../config/abi/types/CatERC721';
import { enhanceGasMargin } from '../../utils';

@Injectable()
export class NFTDeploymentCronJobService implements OnApplicationBootstrap {
  constructor(
    @InjectModel(BlockchainListener.name)
    private BlockchainListenerModel: Model<BlockchainListenerDocument>,
    @InjectModel(NFTInfo.name)
    private NFTInfoModel: Model<NFTInfoDocument>,
    @InjectModel(NFTNetworks.name)
    private NFTNetworksModel: Model<NFTNetworksDocument>,
  ) {
    console.log(
      'In Constructor of NFTDeploymentCronJobService Cron Job Service',
    );
  }

  /**
   * Start application bootstrap callback from nestjs
   */
  async onApplicationBootstrap() {
    console.log('OnApplicationBootstrap in TOKEN DEPLOY cron SERVICE');
  } // end of application bootstrap

  async execute(): CronJob {
    console.log('Running inside NFTDeploymentCronJobService');

    const failedNFTForDeployment = await this.NFTNetworksModel.updateMany(
      {
        status: TokenNetworkDeployStatus.FAILED,
      },
      {
        $set: { status: TokenNetworkDeployStatus.PENDING },
      },
    );

    const pendingNFTForDeployment = await this.NFTNetworksModel.aggregate([
      {
        $match: {
          status: TokenNetworkDeployStatus.PENDING,
          address: null,
        },
      },
      {
        $lookup: {
          from: 'nft_infos',
          localField: 'nftInfo',
          foreignField: '_id',
          as: 'nftDetail',
        },
      },
      {
        $project: {
          address: 1,
          chainId: 1,
          feePaidByUser: 1,
          status: 1,
          type: 1,
          genericTokenAddress: 1,
          nftDetail: { $arrayElemAt: ['$nftDetail', 0] },
        },
      },
      {
        $sort: {
          type: 1, // this is 1 because we want to deploy proxy first and then erc721
        },
      },
    ]);

    console.log(
      ' IN Token Deployment Cron => ',
      pendingNFTForDeployment.length,
    );
    for (const nftNetworkDetail of pendingNFTForDeployment) {
      try {
        await this.NFTNetworksModel.updateOne(
          {
            _id: nftNetworkDetail._id,
          },
          {
            status: TokenNetworkDeployStatus.IN_PROGRESS,
          },
        );
        const rpc = getNativeChainBaseRPCUrl(nftNetworkDetail.chainId);
        const provider = new ethers.providers.JsonRpcProvider(rpc);
        const gasPrice = await provider.getGasPrice();
        const enhanceGasPrice = enhanceGasMargin(gasPrice, 10);
        console.log('----- HIGH FEE -----', enhanceGasPrice.toString());
        const wallet = new ethers.Wallet(
          process.env.HOT_WALLET_PRIVATE_KEY,
          provider,
        );

        const catRelayerContract = CatRelayer__factory.connect(
          getCATRelayerAddress(nftNetworkDetail.chainId),
          wallet,
        );

        let tx = null;
        if (nftNetworkDetail.type === CATType.CATProxyType) {
          tx = await catRelayerContract.handleDeployProxyNFT(
            nftNetworkDetail.genericTokenAddress,
            nftNetworkDetail.nftDetail.salt,
            nftNetworkDetail.nftDetail.owner,
            {
              gasPrice: enhanceGasPrice,
            },
          );

          // as proxy token deployed so lets first wait as we need to do other transactions.
          const receipt = await tx.wait(2); // just wait for atleast 2 blocks to get mined

          // this nested try catch is to handle the case when we are registering on other chains and we are not able to compute address as proxy is already deployed so next we can do manually only this register step.
          try {
            // here first we compute the address of the token so that we should not wait if other chains are pending as address will be same using same salt.

            const catTypeAddress = await catRelayerContract.computeAddressNFT(
              nftNetworkDetail.nftDetail.salt,
              nftNetworkDetail.nftDetail.name,
              nftNetworkDetail.nftDetail.symbol,
            );
            // lets first get the deployed token address from tx receipt
            const proxyDeployedNFTEvent = receipt.events.find(
              (event) => event.event === 'ProxyNFTDeployed',
            );

            if (!proxyDeployedNFTEvent) {
              throw new Error('ProxyNFTDeployed event not found in receipt');
            }
            const deployedTokenAddress = proxyDeployedNFTEvent.args[1];
            // updating in db the deployed token address
            await this.NFTNetworksModel.updateOne(
              {
                _id: nftNetworkDetail._id,
              },
              {
                address: deployedTokenAddress,
                status: TokenNetworkDeployStatus.DEPLOYED,
                owner: nftNetworkDetail.nftDetail.owner,
                deploymentTxHash: tx.hash,
              },
            );
            console.info('Proxy NFT Address', deployedTokenAddress);
            // now lets do register on other chains
            const catERC721 = CatERC721__factory.connect(
              deployedTokenAddress,
              wallet,
            );

            // first filter out the proxy token chain (current chain) and then map to only womrhole chain Ids,
            const allWormholeChains = Object.keys(WORMHOLE_CHAIN_ID_FROM_NATIVE)
              .filter(
                (key) =>
                  +key !== +nftNetworkDetail.chainId &&
                  +key !== SupportedChainId.SOLANA,
              )
              .map((key) => WORMHOLE_CHAIN_ID_FROM_NATIVE[key]);

            const allAddressesInBytes32 = allWormholeChains.map(
              (chainId) => `0x${tryNativeToHexString(catTypeAddress, chainId)}`,
            );
            const nullifiedSignature: CATERC20Structs.SignatureVerificationStruct =
              {
                custodian: wallet.address,
                validTill: 0,
                signature: [],
              };
            const registerChainTx = await catERC721.registerChains(
              allWormholeChains,
              allAddressesInBytes32,
              nullifiedSignature,
              {
                gasPrice: enhanceGasPrice,
              },
            );

            await catERC721.transferOwnership(
              nftNetworkDetail.nftDetail.owner,
              {
                gasPrice: enhanceGasPrice,
              },
            );

            console.log(
              'ALL GOOD AS REGISTER CHAIN HAPPEN AS WELL AND TRANSFERED OWNERSHIP FOR NFT',
            );
          } catch (error) {
            console.error('INSIDE REGISTERING OTHER CHAIN FOR NFT', error);
          }
        } else {
          const totalSupply =
            nftNetworkDetail.nftDetail.tokenMintChainId ===
            nftNetworkDetail.chainId
              ? nftNetworkDetail.nftDetail.totalSupply
              : 0;

          const baseUri =
            nftNetworkDetail.nftDetail.tokenMintChainId ===
            nftNetworkDetail.chainId
              ? nftNetworkDetail.nftDetail.baseUri
              : '';
          tx = await catRelayerContract.deployNFT(
            nftNetworkDetail.nftDetail.name,
            nftNetworkDetail.nftDetail.symbol,
            totalSupply,
            nftNetworkDetail.nftDetail.salt,
            nftNetworkDetail.nftDetail.owner,
            baseUri,
            {
              gasPrice: enhanceGasPrice,
            },
          );

          // as token deployed so lets first wait as we need to do other transactions.
          const receipt = await tx.wait(2); // just wait for atleast 2 blocks to get mined

          // lets first get the deployed token address from tx receipt
          const catDeployedNFTEvent = receipt.events.find(
            (event) => event.event === 'NFTDeployed',
          );

          if (!catDeployedNFTEvent) {
            throw new Error('NFTDeployed event not found in receipt');
          }

          const deployedTokenAddress = catDeployedNFTEvent.args[1];
          // updating in db the deployed token address
          await this.NFTNetworksModel.updateOne(
            {
              _id: nftNetworkDetail._id,
            },
            {
              address: deployedTokenAddress,
              status: TokenNetworkDeployStatus.DEPLOYED,
              owner: nftNetworkDetail.nftDetail.owner,
              deploymentTxHash: tx.hash,
            },
          );
          console.info('CAT NFT Address', deployedTokenAddress);
          // now let's do register on other chains
          const catErc721Contract = CatERC721__factory.connect(
            deployedTokenAddress,
            wallet,
          );

          // first filter out the proxy token chain (current chain) and then map to only womrhole chain Ids,

          const proxyDetailFromDB = await this.NFTNetworksModel.findOne({
            nftInfo: nftNetworkDetail.nftDetail._id,
            type: CATType.CATProxyType,
          }).lean();
          //
          //   pendingNFTForDeployment.find(
          //   (pendingToken) => pendingToken.type === CATType.CATProxyType,
          // );

          if (proxyDetailFromDB) {
            // here means proxy is already deployed so we need to register this chain as well
            if (proxyDetailFromDB.address) {
              const allWormholeChains = [
                WORMHOLE_CHAIN_ID_FROM_NATIVE[proxyDetailFromDB.chainId],
              ];

              const allAddressesInBytes32 = allWormholeChains.map(
                (chainId) =>
                  `0x${tryNativeToHexString(
                    proxyDetailFromDB.address,
                    chainId,
                  )}`,
              );
              const nullifiedSignature: CATERC721Structs.SignatureVerificationStruct =
                {
                  custodian: wallet.address,
                  validTill: 0,
                  signature: [],
                };

              const registerChainTx = await catErc721Contract.registerChains(
                allWormholeChains,
                allAddressesInBytes32,
                nullifiedSignature,
                {
                  gasPrice: enhanceGasPrice,
                },
              );
              await registerChainTx.wait(1);
            }
          } // end of if any cat proxy type.
          await catErc721Contract.transferOwnership(
            nftNetworkDetail.nftDetail.owner,
            {
              gasPrice: enhanceGasPrice,
            },
          );

          console.log(
            'ALL GOOD AS REGISTER CHAIN IF ANY PROXY FOUND HAPPEN AS WELL AND TRANSFERED OWNERSHIP FOR NFT',
          );
        }
      } catch (error) {
        console.error('error in cron For Token Deploy', error);
        await this.NFTNetworksModel.updateOne(
          {
            _id: nftNetworkDetail._id,
          },
          {
            status: TokenNetworkDeployStatus.FAILED,
            error: JSON.stringify(error),
          },
        );
      }
    } // end of loop for token deployment
  } // end of function for handling transaction to deploy token
} // end of class
