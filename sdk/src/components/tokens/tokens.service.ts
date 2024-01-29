import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { GetTokenDeployDTO, GetTokenInfoDTO } from './dto/get.token.deploy.dto';
import { getNativeChainBaseRPCUrl } from 'utils/getRpcUrl';
import { BigNumber, ethers } from 'ethers';
import { CatErc20__factory, CatRelayer__factory } from 'config/abi/types';
import { getCATRelayerAddress } from 'utils/addressHelpers';
import { encodeParameters, enhanceGasMargin } from 'utils';
import {
  CAT_PROXY_TOKEN_INTERFACE_ID,
  CAT_TOKEN_INTERFACE_ID,
  TOKEN_DEPLOY_GAS_LIMIT,
} from 'config/constants';
import { COIN_GECKO_IDS } from 'config/constants/chains';
import { InjectModel } from '@nestjs/mongoose';
import {
  CryptoPrices,
  CryptoPricesDocument,
} from 'entities/crypto.prices.entity';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
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

@Injectable()
export class TokensService {
  constructor(
    @InjectModel(CryptoPrices.name)
    private CryptoPricesModel: Model<CryptoPricesDocument>,
    @InjectModel(TokenInfo.name)
    private TokenInfoModel: Model<TokenInfoDocument>,
    @InjectModel(TokenNetworks.name)
    private TokenNetworksModel: Model<TokenNetworksDocument>,
  ) {
    console.log('In Constructor of NftService');
  }

  /**
   * Function to serve api when user try to see progress of token deployed on his all destination chains.
   */
  async getTokensDeployStatus(req: Request, salt: string, res: Response) {
    try {
      const tokenInfo = await this.TokenInfoModel.findOne({
        salt,
      }).lean();

      if (!tokenInfo) {
        throw new Error('Token not found');
      }
      const tokenNetworks = await this.TokenNetworksModel.find({
        tokenInfo,
      }).lean();

      tokenNetworks.sort((x,y) => x.chainId === tokenInfo.tokenMintChainId ? -1 : y.chainId === tokenInfo.tokenMintChainId ? 1 : 0);
      return res.status(200).json({
        code: 200,
        message: 'success',
        tokenInfo,
        tokenNetworks,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        code: 500,
        message: error.message,
      });
    }
  } // end of function
  /**
   * Function to serve api when user try to see how much it will cost if he try to do token deploy on his all destination chains.
   * @param req
   * @param tokenDeployDTO
   * @param res
   * @returns
   */
  async getTokensDeploy(
    req: Request,
    tokenDeployDTO: GetTokenDeployDTO,
    res: Response,
  ) {
    try {
      if (
        tokenDeployDTO.type == CATType.GENERIC &&
        !tokenDeployDTO.genericTokenAddress
      ) {
        throw new Error(
          'Generic token address is required for generic token type.',
        );
      }
      let tokenInfoWithAlreadySalt = undefined;

      if (
        tokenDeployDTO.type == CATType.GENERIC &&
        tokenDeployDTO.genericTokenAddress &&
        !tokenDeployDTO.salt
      ) {
        const tokenNetworkDetail = await this.TokenNetworksModel.findOne({
          genericTokenAddress: tokenDeployDTO.genericTokenAddress,
          chainId: tokenDeployDTO.tokenMintingChain,
        }).lean();

        if (tokenNetworkDetail) {
          throw new Error(
            'please provide salt to deploy token on same generic token address.',
          );
        } // end of token Network Detail
      } // end of if when generic token address is provided.
      // here means user is trying to deploy token on same salt again either with same name or different name.
      if (tokenDeployDTO.salt) {
        const tokenInfoWithNetwork = await this.TokenInfoModel.aggregate([
          {
            $match: {
              salt: tokenDeployDTO.salt,
            },
          },
          {
            $lookup: {
              from: 'token_networks',
              localField: '_id',
              foreignField: 'tokenInfo',
              as: 'networks',
            },
          },
        ]);

        if (tokenInfoWithNetwork.length == 0) {
          throw Error('No Salt Info found.');
        }

        tokenInfoWithAlreadySalt = tokenInfoWithNetwork[0];

        // first we are checking all the destination chains are unique and not deployed before.
        const isAllDestinationChainUnique =
          tokenDeployDTO.destinationChains.every((chain) => {
            return !tokenInfoWithAlreadySalt.networks.find(
              (networkInfo) =>
                +networkInfo.chainId === +chain &&
                networkInfo.status === TokenNetworkDeployStatus.DEPLOYED,
            );
          });

        if (!isAllDestinationChainUnique) {
          throw Error('Some of Destination Chain a');
        } //

        if (
          tokenDeployDTO.owner.toLowerCase() !==
          tokenInfoWithAlreadySalt.owner.toLowerCase()
        ) {
          throw Error('Owner is not same as previous owner');
        }
      } // end of if when salt provided.

      const destinationChainsSymbol = tokenDeployDTO.destinationChains.map(
        (destinationChain) => COIN_GECKO_IDS[destinationChain],
      );

      // there could be case if user try to pay fee on one chain and then deploy on other chains.
      destinationChainsSymbol.push(
        COIN_GECKO_IDS[tokenDeployDTO.tokenMintingChain],
      );

      const cryptoRates = await this.CryptoPricesModel.find({
        symbol: { $in: destinationChainsSymbol },
      }).lean();
      let totalGasFeeInUSDOnMintingChain = 0; // this total usd value of gas fee will help us to calculate total fee in token minting chain as we are going to ask user to pay fee in token minting chain.
      const gasValuesForContractDeployment = [];
      const gasPricesForContractDeployment = [];

      for (const destinationChain of tokenDeployDTO.destinationChains) {
        const rpcUrl = getNativeChainBaseRPCUrl(+destinationChain);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const gasPrice = await provider.getGasPrice();
        const enhanceGasPrice = enhanceGasMargin(gasPrice, 30);
        let gasFeeInWei = enhanceGasPrice.mul(
          BigNumber.from(TOKEN_DEPLOY_GAS_LIMIT),
        );

        if (+ethers.utils.formatEther(gasFeeInWei) < 0.0004) {
          gasFeeInWei = BigNumber.from(ethers.utils.parseEther('0.0004'));
        }

        gasFeeInWei = enhanceGasMargin(gasFeeInWei, 20);

        console.info(
          'enhanceGasPrice',
          gasFeeInWei.toString(),
          ethers.utils.formatEther(gasFeeInWei),
        );
        const usdRateForChain = cryptoRates.find(
          (cryptoRate) =>
            cryptoRate.symbol === COIN_GECKO_IDS[destinationChain],
        );
        if (!usdRateForChain) {
          throw Error('No rate found for chain' + destinationChain);
        }

        const gasFeeInNative = +ethers.utils.formatEther(gasFeeInWei);
        const gasFeeInUSD = gasFeeInNative * usdRateForChain.priceInUSD;
        totalGasFeeInUSDOnMintingChain += gasFeeInUSD;
        // here we will be storing in db so that we can use it later to show user how much he will be paying in total.
        gasPricesForContractDeployment.push(enhanceGasPrice.toString());
        gasValuesForContractDeployment.push(gasFeeInWei.toString());
      } // end of for loop

      const usdRateForChainToPayFee = cryptoRates.find(
        (cryptoRate) =>
          cryptoRate.symbol ===
          COIN_GECKO_IDS[tokenDeployDTO.tokenMintingChain],
      );
      if (!usdRateForChainToPayFee) {
        console.error(
          'No rate found for chain',
          tokenDeployDTO.tokenMintingChain,
        );
      }

      const totalGasFeeInTokenMintingChain = +(
        totalGasFeeInUSDOnMintingChain / usdRateForChainToPayFee.priceInUSD
      ).toFixed(18);
      const totalGasFeeInTokenMintingChainInWei = ethers.utils.parseEther(
        totalGasFeeInTokenMintingChain.toString(),
      );
      const rpcUrl = getNativeChainBaseRPCUrl(
        +tokenDeployDTO.tokenMintingChain,
      );
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const relayerContract = CatRelayer__factory.connect(
        getCATRelayerAddress(+tokenDeployDTO.tokenMintingChain),
        provider,
      );

      const uuid = uuidv4();
      const randomStr = uuid.slice(0, 16) + '-' + Date.now();
      const saltInBytes32 = tokenDeployDTO.salt
        ? tokenDeployDTO.salt
        : ethers.utils.formatBytes32String(randomStr);

      const encodedParameters = encodeParameters(
        ['string', 'string', 'uint8', 'uint256', 'bytes32', 'address'],
        [
          tokenDeployDTO.name, // name
          tokenDeployDTO.symbol, // symbol
          tokenDeployDTO.decimals.toString(), // decimals
          tokenDeployDTO.totalSupply, // totalSupply
          saltInBytes32, // salt
          tokenDeployDTO.owner,
        ],
      );

      if (!tokenDeployDTO.salt) {
        // if salt is not provided then we are creating new record in token info table

        tokenInfoWithAlreadySalt = await this.TokenInfoModel.create({
          name: tokenDeployDTO.name,
          symbol: tokenDeployDTO.symbol,
          decimals: tokenDeployDTO.decimals,
          totalSupply: tokenDeployDTO.totalSupply,
          owner: tokenDeployDTO.owner,
          salt: saltInBytes32,
          tokenMintChainId: tokenDeployDTO.tokenMintingChain,
          feeForPaymentChainId: tokenDeployDTO.tokenMintingChain,
          gasValuesForContractDeployment,
          gasPricesForContractDeployment,
          totalGasFeeInUSDOnFeePaymentChain: totalGasFeeInUSDOnMintingChain,
          totalGasFeeOnFeePaymentChain: totalGasFeeInTokenMintingChain,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } // end of if when salt not provided
      else {
        const isAnyTokenNetworkDeployed =
          tokenInfoWithAlreadySalt.networks.find(
            (network) => network.status === TokenNetworkDeployStatus.DEPLOYED,
          );
        // const isAnyTokenNetworkDeployed =
        //   await this.TokenNetworksModel.countDocuments({
        //     tokenInfo: tokenInfoWithAlreadySalt._id,
        //     status: TokenNetworkDeployStatus.DEPLOYED,
        //   });

        if (!isAnyTokenNetworkDeployed) {
          await this.TokenInfoModel.updateOne(
            {
              _id: tokenInfoWithAlreadySalt._id,
            },
            {
              name: tokenDeployDTO.name,
              symbol: tokenDeployDTO.symbol,
              decimals: tokenDeployDTO.decimals,
              totalSupply: tokenDeployDTO.totalSupply,
              owner: tokenDeployDTO.owner,
              salt: saltInBytes32,
              tokenMintChainId: tokenDeployDTO.tokenMintingChain,
              feeForPaymentChainId: tokenDeployDTO.tokenMintingChain,
              gasValuesForContractDeployment,
              gasPricesForContractDeployment,
              totalGasFeeInUSDOnFeePaymentChain: totalGasFeeInUSDOnMintingChain,
              totalGasFeeOnFeePaymentChain: totalGasFeeInTokenMintingChain,
            },
            {
              upsert: false,
            },
          );
        }
      }

      await this.TokenNetworksModel.deleteMany({
        tokenInfo: tokenInfoWithAlreadySalt._id,
        status: TokenNetworkDeployStatus.QUERIED,
      });
      const docsToUpdateInNetworks = [];

      const isAlreadyProxyDeployed =
        tokenInfoWithAlreadySalt && tokenInfoWithAlreadySalt.networks
          ? tokenInfoWithAlreadySalt.networks.find(
              (network) =>
                network.type === CATType.CATProxyType &&
                network.status === TokenNetworkDeployStatus.DEPLOYED,
            )
          : false;
      for (const destinationChain of tokenDeployDTO.destinationChains) {
        // as we are upserting in case user call multiple time queries and didn't pay fee to initiate the deployment.

        // const isAlreadyProxyDeployed = await this.TokenNetworksModel.findOne({
        //   tokenInfo: tokenInfoWithAlreadySalt._id,
        //   type: CATType.CATProxyType,
        // }).lean();
        let type = CATType.CATType;
        if (
          !isAlreadyProxyDeployed && // this is that already proxy deployed then we don't need to deploy proxy again.
          +destinationChain === +tokenDeployDTO.tokenMintingChain &&
          tokenDeployDTO.type === CATType.GENERIC
        ) {
          type = CATType.CATProxyType;
        }
        docsToUpdateInNetworks.push({
          updateOne: {
            filter: {
              tokenInfo: tokenInfoWithAlreadySalt._id,
              chainId: destinationChain,
            },
            update: {
              tokenInfo: tokenInfoWithAlreadySalt._id,
              chainId: destinationChain,
              owner: tokenDeployDTO.owner,
              type,
              genericTokenAddress:
                tokenDeployDTO.type == CATType.GENERIC &&
                +tokenDeployDTO.tokenMintingChain === +destinationChain
                  ? tokenDeployDTO.genericTokenAddress
                  : null,
            },
            upsert: true,
          },
        });
      } // end of for loop of all chains need to be deployed

      await this.TokenNetworksModel.bulkWrite(docsToUpdateInNetworks);

      const data = relayerContract.interface.encodeFunctionData(
        'initiateTokensDeployment',
        [
          encodedParameters,
          tokenDeployDTO.destinationChains,
          gasValuesForContractDeployment,
          tokenDeployDTO.tokenMintingChain,
        ],
      );
      return res.status(200).json({
        code: 200,
        message: 'success',
        totalGasFeeInUSDOnMintingChain,
        totalGasFeeInTokenMintingChain,
        chainId: tokenDeployDTO.tokenMintingChain,
        salt: saltInBytes32,
        transaction: {
          to: getCATRelayerAddress(+tokenDeployDTO.tokenMintingChain),
          value: totalGasFeeInTokenMintingChainInWei.toString(),
          data,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(400).json({
        message: error.message,
      });
    }
  } //  end of function

  /**
   * Get Token Info from DB or From Network
   * @param getTokenInfoDTO token info dto which contain address and chain ID
   * @param res express response object
   */
  async getTokensInfo(getTokenInfoDTO: GetTokenInfoDTO, res: Response) {
    try {
      let tokenNetworkInfo = await this.TokenNetworksModel.findOne({
        address: { $regex: new RegExp(getTokenInfoDTO.token, 'i') },
        chainId: getTokenInfoDTO.chainId,
      })
        .populate({ path: 'tokenInfo', model: TokenInfo.name })
        .lean();

      const tokenNetworkInfoFromGeneric = await this.TokenNetworksModel.findOne(
        {
          genericTokenAddress: {
            $regex: new RegExp(getTokenInfoDTO.token, 'i'),
          },
          chainId: getTokenInfoDTO.chainId,
        },
      )
        .populate({ path: 'tokenInfo', model: TokenInfo.name })
        .lean();

      tokenNetworkInfo = tokenNetworkInfo || tokenNetworkInfoFromGeneric;
      let deployedNetworks = [];
      let type = CATType.CATType;
      let tokenInfo = null;
      if (!tokenNetworkInfo) {
        //: here means its not in our db so we will fetch it from network and will have 2 use cases . either its already burn and mint or its normal token.
        const rpcUrl = getNativeChainBaseRPCUrl(getTokenInfoDTO.chainId);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const tokenContract = await CatErc20__factory.connect(
          getTokenInfoDTO.token,
          provider,
        );

        console.info('BEfore getting token info');
        const name = await tokenContract.name();
        console.info('NAME ', name);

        const symbol = await tokenContract.symbol();
        console.info('SYMBOL ', symbol);
        const decimals = await tokenContract.decimals();
        const totalSupply = (await tokenContract.totalSupply()).toString();
        tokenInfo = {
          name,
          symbol,
          decimals,
          totalSupply,
        };
        // this try catch is to check if its CAT20 or not by using supported interface.
        try {
          const isCAT20 = await tokenContract.supportsInterface(
            CAT_TOKEN_INTERFACE_ID,
          );

          if (!isCAT20) {
            type = CATType.CATProxyType;
          }
        } catch (error) {
          // here error means function not found in contract, so it's not CAT20.
          type = CATType.GENERIC;
        } // end of try catch.
      } else {
        const allTokenNetworks = await this.TokenNetworksModel.find({
          tokenInfo: tokenNetworkInfo.tokenInfo,
          status: TokenNetworkDeployStatus.DEPLOYED,
        }).lean();
        type =
          tokenNetworkInfo.type === CATType.CATProxyType
            ? CATType.GENERIC
            : tokenNetworkInfo.type;
        deployedNetworks = allTokenNetworks.map(
          (tokenNetwork) => tokenNetwork.chainId,
        );

        tokenInfo = tokenNetworkInfo.tokenInfo;
      }
      return res.status(200).json({
        code: 200,
        message: 'success',
        deployedNetworks,
        type,
        tokenInfo,
      });
    } catch (error) {
      console.error(error);
      let message = error.message;
      if (error.message.includes('call revert exception ')) {
        message = 'Invalid Token Address';
      }
      return res.status(400).json({
        message,
      });
    }
  } //  end of function
  /*
   * Get All Tokens with networks
   */
  async getAllTokens(res: Response) {
    try {
      const tokens = await this.TokenInfoModel.aggregate([
        {
          $lookup: {
            from: 'token_networks',
            localField: '_id',
            foreignField: 'tokenInfo',
            pipeline: [
              {
                $match: {
                  status: TokenNetworkDeployStatus.DEPLOYED,
                },
              },
            ],
            as: 'networks',
          },
        },
        {
          $match: {
            $expr: {
              $gt: [{ $size: '$networks' }, 1],
            },
          },
        },
      ]);
      return res.status(200).json({
        code: 200,
        message: 'success',
        tokens,
      });
    } catch (error) {
      console.error(error);
      return res.status(400).json({
        message: error.message,
      });
    }
  }
} // end of class
