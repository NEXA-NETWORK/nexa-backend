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
import { CatErc20__factory, CatRelayer__factory } from 'config/abi/types';
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
  TokenNetworkDeployStatus,
  TokenNetworks,
  TokenNetworksDocument,
} from 'entities/tokens/token.networks.entity';
import { CATType } from '../../config/constants/types';
import { tryNativeToHexString } from '@certusone/wormhole-sdk';
import { CATERC20Structs } from '../../config/abi/types/CatErc20';
import { enhanceGasMargin } from '../../utils';
import { TOKEN_DEPLOY_GAS_LIMIT } from 'config/constants';

@Injectable()
export class TokensDeploymentCronJobService implements OnApplicationBootstrap {
  private isCronRunning = false; // for cron status
  constructor(
    @InjectModel(BlockchainListener.name)
    private BlockchainListenerModel: Model<BlockchainListenerDocument>,
    @InjectModel(TokenInfo.name)
    private TokenInfoModel: Model<TokenInfoDocument>,
    @InjectModel(TokenNetworks.name)
    private TokenNetworksModel: Model<TokenNetworksDocument>,
  ) {
    console.log(
      'In Constructor of TokensDeploymentEventTrackerCronJobService Cron Job Service',
    );
  }

  /**
   * Start application bootstrap callback from nestjs
   */
  async onApplicationBootstrap() {
    console.log('OnApplicationBootstrap in TOKEN DEPLOY cron SERVICE');
  } // end of application bootstrap

  async execute(): CronJob {
    console.log('Running inside TokensDeploymentCronJobService');

    const failedTokenForDeployment = await this.TokenNetworksModel.updateMany(
      {
        status: TokenNetworkDeployStatus.FAILED,
      },
      {
        $set: { status: TokenNetworkDeployStatus.PENDING },
      },
    );

    const pendingTokenForDeployment = await this.TokenNetworksModel.aggregate([
      {
        $match: {
          status: TokenNetworkDeployStatus.PENDING,
          address: null,
        },
      },
      {
        $lookup: {
          from: 'token_infos',
          localField: 'tokenInfo',
          foreignField: '_id',
          as: 'tokenDetail',
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
          tokenDetail: { $arrayElemAt: ['$tokenDetail', 0] },
        },
      },
      {
        $sort: {
          type: 1,
        },
      },
    ]);

    console.log(
      ' IN Token Deployment Cron => ',
      pendingTokenForDeployment.length,
    );
    for (const tokenNetworkDetail of pendingTokenForDeployment) {
      try {
        await this.TokenNetworksModel.updateOne(
          {
            _id: tokenNetworkDetail._id,
          },
          {
            status: TokenNetworkDeployStatus.IN_PROGRESS,
          },
        );
        const rpc = getNativeChainBaseRPCUrl(tokenNetworkDetail.chainId);
        const provider = new ethers.providers.JsonRpcProvider(rpc);
        const gasPrice = await provider.getGasPrice();
        const enhanceGasPriceForTx = enhanceGasMargin(gasPrice, 10);
        let overrideOptions: any = {
          gasPrice: enhanceGasPriceForTx,
        };

        if (tokenNetworkDetail.chainId === SupportedChainId.ETHEREUM) {
          // const block = await provider.getBlock('latest');
          // overrideOptions['maxFeePerGas'] = block.baseFeePerGas;
          overrideOptions = { gasLimit: TOKEN_DEPLOY_GAS_LIMIT };
        }

        console.log(
          '----- HIGH FEE IN TOKEN DEPLOYMENT-----',
          enhanceGasPriceForTx.toString(),
        );
        const wallet = new ethers.Wallet(
          process.env.HOT_WALLET_PRIVATE_KEY,
          provider,
        );

        const catRelayerContract = CatRelayer__factory.connect(
          getCATRelayerAddress(tokenNetworkDetail.chainId),
          wallet,
        );

        const chainIdForMintingToken =
          WORMHOLE_CHAIN_ID_FROM_NATIVE[
            +tokenNetworkDetail.tokenDetail.tokenMintChainId
          ];

        let tx = null;
        if (tokenNetworkDetail.type === CATType.CATProxyType) {
          tx = await catRelayerContract.handleDeployProxyToken(
            tokenNetworkDetail.genericTokenAddress, // todo: change this to token address
            tokenNetworkDetail.tokenDetail.salt,
            tokenNetworkDetail.tokenDetail.owner,
            overrideOptions,
          );

          // as proxy token deployed so lets first wait as we need to do other transactions.
          const receipt = await tx.wait(2); // just wait for atleast 2 blocks to get mined

          // this nested try catch is to handle the case when we are registering on other chains and we are not able to compute address as proxy is already deployed so next we can do manually only this register step.
          try {
            // here first we compute the address of the token so that we should not wait if other chains are pending as address will be same using same salt.

            const catTypeAddress = await catRelayerContract.computeAddress(
              tokenNetworkDetail.tokenDetail.salt,
              tokenNetworkDetail.tokenDetail.name,
              tokenNetworkDetail.tokenDetail.symbol,
              tokenNetworkDetail.tokenDetail.decimals,
            );
            // lets first get the deployed token address from tx receipt
            const proxyDeployedTokenEvent = receipt.events.find(
              (event) => event.event === 'ProxyTokenDeployed',
            );

            if (!proxyDeployedTokenEvent) {
              throw new Error('ProxyTokenDeployed event not found in receipt');
            }

            const deployedTokenAddress = proxyDeployedTokenEvent.args[1];
            // updating in db the deployed token address
            await this.TokenNetworksModel.updateOne(
              {
                _id: tokenNetworkDetail._id,
              },
              {
                address: deployedTokenAddress,
                status: TokenNetworkDeployStatus.DEPLOYED,
                owner: tokenNetworkDetail.tokenDetail.owner,
                deploymentTxHash: tx.hash,
              },
            );
            console.info('Proxy Token Address', deployedTokenAddress);
            // now lets do register on other chains
            const catErc20Contract = CatErc20__factory.connect(
              deployedTokenAddress,
              wallet,
            );

            // first filter out the proxy token chain (current chain) and then map to only womrhole chain Ids,
            const allWormholeChains = Object.keys(WORMHOLE_CHAIN_ID_FROM_NATIVE)
              .filter(
                (key) =>
                  +key !== +tokenNetworkDetail.chainId &&
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
            const registerChainTx = await catErc20Contract.registerChains(
              allWormholeChains,
              allAddressesInBytes32,
              nullifiedSignature,
              overrideOptions,
            );

            await catErc20Contract.transferOwnership(
              tokenNetworkDetail.tokenDetail.owner,
              overrideOptions,
            );

            console.log(
              'ALL GOOD AS REGISTER CHAIN HAPPEN AS WELL AND TRANSFERED OWNERSHIP',
            );
          } catch (error) {
            console.error('INSIDE REGISTERING OTHER CHAIN', error);
          }
        } else {
          tx = await catRelayerContract.deployToken(
            tokenNetworkDetail.tokenDetail.name,
            tokenNetworkDetail.tokenDetail.symbol,
            tokenNetworkDetail.tokenDetail.decimals,
            tokenNetworkDetail.tokenDetail.totalSupply,
            tokenNetworkDetail.tokenDetail.salt,
            tokenNetworkDetail.tokenDetail.owner,
            chainIdForMintingToken,
            overrideOptions,
          );

          // as token deployed so lets first wait as we need to do other transactions.
          const receipt = await tx.wait(2); // just wait for atleast 2 blocks to get mined

          // lets first get the deployed token address from tx receipt
          const catDeployedTokenEvent = receipt.events.find(
            (event) => event.event === 'TokenDeployed',
          );

          if (!catDeployedTokenEvent) {
            throw new Error('TokenDeployed event not found in receipt');
          }

          const deployedTokenAddress = catDeployedTokenEvent.args[1];
          // updating in db the deployed token address
          await this.TokenNetworksModel.updateOne(
            {
              _id: tokenNetworkDetail._id,
            },
            {
              address: deployedTokenAddress,
              status: TokenNetworkDeployStatus.DEPLOYED,
              owner: tokenNetworkDetail.tokenDetail.owner,
              deploymentTxHash: tx.hash,
            },
          );
          console.info('CAT Token Address', deployedTokenAddress);
          // now let's do register on other chains
          const catErc20Contract = CatErc20__factory.connect(
            deployedTokenAddress,
            wallet,
          );

          // first filter out the proxy token chain (current chain) and then map to only womrhole chain Ids,

          const proxyDetailFromDB = await this.TokenNetworksModel.findOne({
            tokenInfo: tokenNetworkDetail.tokenDetail._id,
            type: CATType.CATProxyType,
          }).lean();
          //
          //   pendingTokenForDeployment.find(
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
              const nullifiedSignature: CATERC20Structs.SignatureVerificationStruct =
                {
                  custodian: wallet.address,
                  validTill: 0,
                  signature: [],
                };

              const registerChainTx = await catErc20Contract.registerChains(
                allWormholeChains,
                allAddressesInBytes32,
                nullifiedSignature,
                overrideOptions,
              );
              await registerChainTx.wait(1);
            }
          } // end of if any cat proxy type.
          await catErc20Contract.transferOwnership(
            tokenNetworkDetail.tokenDetail.owner,
            overrideOptions,
          );

          console.log(
            'ALL GOOD AS REGISTER CHAIN HAPPEN AS WELL AND TRANSFERED OWNERSHIP',
          );
        }
      } catch (error) {
        console.error('error in cron For Token Deploy', error);
        await this.TokenNetworksModel.updateOne(
          {
            _id: tokenNetworkDetail._id,
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
