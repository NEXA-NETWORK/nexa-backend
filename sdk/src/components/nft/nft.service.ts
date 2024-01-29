import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { GetNftDeployDto, GetNFTInfoDTO } from './dto/get.nft.deploy.dto';
import { getNativeChainBaseRPCUrl } from 'utils/getRpcUrl';
import { BigNumber, ethers } from 'ethers';
import { CatERC721__factory, CatRelayer__factory } from 'config/abi/types';
import { getCATRelayerAddress } from 'utils/addressHelpers';
import { encodeParameters, enhanceGasMargin } from 'utils';
import {
  CAT_NFT_INTERFACE_ID,
  CAT_PROXY_NFT_INTERFACE_ID,
  CAT_TOKEN_INTERFACE_ID,
  NFT_DEPLOY_GAS_LIMIT,
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
import { TokenNetworkDeployStatus } from 'entities/tokens/token.networks.entity';
import { NFTInfo, NFTInfoDocument } from '../../entities/nfts/nft.info.entity';
import {
  NFTNetworks,
  NFTNetworksDocument,
} from '../../entities/nfts/nft.networks.entity';
import { CATType } from '../../config/constants/types';

@Injectable()
export class NftService {
  constructor(
    @InjectModel(CryptoPrices.name)
    private CryptoPricesModel: Model<CryptoPricesDocument>,
    @InjectModel(NFTInfo.name)
    private NFTInfoModel: Model<NFTInfoDocument>,
    @InjectModel(NFTNetworks.name)
    private NFTNetworksModel: Model<NFTNetworksDocument>,
  ) {
    console.log('In Constructor of NftService');
  }

  /**
   * Function to serve api when user try to see progress of token deployed on his all destination chains.
   */
  async getNFTDeployStatus(req: Request, salt: string, res: Response) {
    try {
      const nftInfo = await this.NFTInfoModel.findOne({
        salt,
      }).lean();

      if (!nftInfo) {
        throw new Error('NFT not found');
      }
      const nftNetworks = await this.NFTNetworksModel.find({
        nftInfo,
      }).lean();

      return res.status(200).json({
        code: 200,
        message: 'success',
        nftInfo,
        nftNetworks,
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
   * @param nftDeployDTO
   * @param res
   * @returns
   */
  async getNFTDeploy(
    req: Request,
    nftDeployDTO: GetNftDeployDto,
    res: Response,
  ) {
    try {
      if (!nftDeployDTO.baseUri) {
        nftDeployDTO.baseUri = 'https://boredapeyachtclub.com/api/mutants/';
      }
      if (
        nftDeployDTO.type == CATType.GENERIC &&
        !nftDeployDTO.genericTokenAddress
      ) {
        throw new Error(
          'Generic token address is required for generic token type.',
        );
      }
      let nftInfoWithAlreadySalt = undefined;

      if (
        nftDeployDTO.type == CATType.GENERIC &&
        nftDeployDTO.genericTokenAddress &&
        !nftDeployDTO.salt
      ) {
        const nftNetworkDetail = await this.NFTNetworksModel.findOne({
          genericTokenAddress: nftDeployDTO.genericTokenAddress,
        }).lean();

        if (nftNetworkDetail) {
          throw new Error(
            'please provide salt to deploy nft on same generic token address.',
          );
        } // end of token Network Detail
      } // end of if when generic token address is provided.
      // here means user is trying to deploy token on same salt again either with same name or different name.
      if (nftDeployDTO.salt) {
        const nftInfoWithNetwork = await this.NFTInfoModel.aggregate([
          {
            $match: {
              salt: nftDeployDTO.salt,
            },
          },
          {
            $lookup: {
              from: 'nft_networks',
              localField: '_id',
              foreignField: 'nftInfo',
              as: 'networks',
            },
          },
        ]);

        if (nftInfoWithNetwork.length == 0) {
          throw Error('No Salt Info found.');
        }

        nftInfoWithAlreadySalt = nftInfoWithNetwork[0];

        // first we are checking all the destination chains are unique and not deployed before.
        const isAllDestinationChainUnique =
          nftDeployDTO.destinationChains.every((chain) => {
            return !nftInfoWithAlreadySalt.networks.find(
              (networkInfo) =>
                +networkInfo.chainId === +chain &&
                networkInfo.status === TokenNetworkDeployStatus.DEPLOYED,
            );
          });

        if (!isAllDestinationChainUnique) {
          throw Error('Some of Destination Chain a');
        } //

        if (
          nftDeployDTO.owner.toLowerCase() !==
          nftInfoWithAlreadySalt.owner.toLowerCase()
        ) {
          throw Error('Owner is not same as previous owner');
        }
      } // end of if when salt provided.

      const destinationChainsSymbol = nftDeployDTO.destinationChains.map(
        (destinationChain) => COIN_GECKO_IDS[destinationChain],
      );

      // there could be case if user try to pay fee on one chain and then deploy on other chains.
      destinationChainsSymbol.push(
        COIN_GECKO_IDS[nftDeployDTO.tokenMintingChain],
      );

      const cryptoRates = await this.CryptoPricesModel.find({
        symbol: { $in: destinationChainsSymbol },
      }).lean();
      let totalGasFeeInUSDOnMintingChain = 0; // this total usd value of gas fee will help us to calculate total fee in token minting chain as we are going to ask user to pay fee in token minting chain.
      const gasValuesForContractDeployment = [];
      const gasPricesForContractDeployment = [];

      for (const destinationChain of nftDeployDTO.destinationChains) {
        const rpcUrl = getNativeChainBaseRPCUrl(+destinationChain);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const gasPrice = await provider.getGasPrice();
        const enhanceGasPrice = enhanceGasMargin(gasPrice, 30);
        let gasFeeInWei = enhanceGasPrice.mul(
          BigNumber.from(NFT_DEPLOY_GAS_LIMIT),
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
          cryptoRate.symbol === COIN_GECKO_IDS[nftDeployDTO.tokenMintingChain],
      );
      if (!usdRateForChainToPayFee) {
        console.error(
          'No rate found for chain',
          nftDeployDTO.tokenMintingChain,
        );
      }

      const totalGasFeeInTokenMintingChain = +(
        totalGasFeeInUSDOnMintingChain / usdRateForChainToPayFee.priceInUSD
      ).toFixed(18);
      const totalGasFeeInTokenMintingChainInWei = ethers.utils.parseEther(
        totalGasFeeInTokenMintingChain.toString(),
      );
      const rpcUrl = getNativeChainBaseRPCUrl(+nftDeployDTO.tokenMintingChain);
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const relayerContract = await CatRelayer__factory.connect(
        getCATRelayerAddress(+nftDeployDTO.tokenMintingChain),
        provider,
      );

      const uuid = uuidv4();
      const randomStr = uuid.slice(0, 16) + '-' + Date.now();
      const saltInBytes32 = nftDeployDTO.salt
        ? nftDeployDTO.salt
        : ethers.utils.formatBytes32String(randomStr);

      const encodedParameters = encodeParameters(
        ['string', 'string', 'string', 'uint256', 'bytes32', 'address'],
        [
          nftDeployDTO.name, // name
          nftDeployDTO.symbol, // symbol
          nftDeployDTO.baseUri, // base uri
          nftDeployDTO.totalSupply, // totalSupply
          saltInBytes32, // salt
          nftDeployDTO.owner,
        ],
      );

      if (!nftDeployDTO.salt) {
        // if salt is not provided then we are creating new record in token info table

        nftInfoWithAlreadySalt = await this.NFTInfoModel.create({
          name: nftDeployDTO.name,
          symbol: nftDeployDTO.symbol,
          baseUri: nftDeployDTO.baseUri,
          totalSupply: nftDeployDTO.totalSupply,
          owner: nftDeployDTO.owner,
          salt: saltInBytes32,
          tokenMintChainId: nftDeployDTO.tokenMintingChain,
          feeForPaymentChainId: nftDeployDTO.tokenMintingChain,
          gasValuesForContractDeployment,
          gasPricesForContractDeployment,
          totalGasFeeInUSDOnFeePaymentChain: totalGasFeeInUSDOnMintingChain,
          totalGasFeeOnFeePaymentChain: totalGasFeeInTokenMintingChain,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } // end of if when salt not provided
      else {
        const isAnyTokenNetworkDeployed = nftInfoWithAlreadySalt.networks.find(
          (network) => network.status === TokenNetworkDeployStatus.DEPLOYED,
        );

        if (!isAnyTokenNetworkDeployed) {
          await this.NFTInfoModel.updateOne(
            {
              _id: nftInfoWithAlreadySalt._id,
            },
            {
              name: nftDeployDTO.name,
              symbol: nftDeployDTO.symbol,
              baseUri: nftDeployDTO.baseUri,
              totalSupply: nftDeployDTO.totalSupply,
              owner: nftDeployDTO.owner,
              salt: saltInBytes32,
              tokenMintChainId: nftDeployDTO.tokenMintingChain,
              feeForPaymentChainId: nftDeployDTO.tokenMintingChain,
              gasValuesForContractDeployment,
              gasPricesForContractDeployment,
              totalGasFeeInUSDOnFeePaymentChain: totalGasFeeInUSDOnMintingChain,
              totalGasFeeOnFeePaymentChain: totalGasFeeInTokenMintingChain,
              updatedAt: Date.now(),
            },
            {
              upsert: false,
            },
          );
        }
      }

      await this.NFTNetworksModel.deleteMany({
        nftInfo: nftInfoWithAlreadySalt._id,
        status: TokenNetworkDeployStatus.QUERIED,
      });
      const docsToUpdateInNetworks = [];

      const isAlreadyProxyDeployed =
        nftInfoWithAlreadySalt && nftInfoWithAlreadySalt.networks
          ? nftInfoWithAlreadySalt.networks.find(
              (network) =>
                network.type === CATType.CATProxyType &&
                network.status === TokenNetworkDeployStatus.DEPLOYED,
            )
          : false;
      for (const destinationChain of nftDeployDTO.destinationChains) {
        // as we are upserting in case user call multiple time queries and didn't pay fee to initiate the deployment.

        // const isAlreadyProxyDeployed = await this.TokenNetworksModel.findOne({
        //   tokenInfo: nftInfoWithAlreadySalt._id,
        //   type: CATType.CATProxyType,
        // }).lean();
        let type = CATType.CATType;
        if (
          !isAlreadyProxyDeployed && // this is that already proxy deployed then we don't need to deploy proxy again.
          +destinationChain === +nftDeployDTO.tokenMintingChain &&
          nftDeployDTO.type === CATType.GENERIC
        ) {
          type = CATType.CATProxyType;
        }
        docsToUpdateInNetworks.push({
          updateOne: {
            filter: {
              nftInfo: nftInfoWithAlreadySalt._id,
              chainId: destinationChain,
            },
            update: {
              nftInfo: nftInfoWithAlreadySalt._id,
              chainId: destinationChain,
              owner: nftDeployDTO.owner,
              type,
              status: TokenNetworkDeployStatus.QUERIED,
              genericTokenAddress:
                nftDeployDTO.type == CATType.GENERIC &&
                +nftDeployDTO.tokenMintingChain === +destinationChain
                  ? nftDeployDTO.genericTokenAddress
                  : null,
            },
            upsert: true,
          },
        });
      } // end of for loop of all chains need to be deployed

      await this.NFTNetworksModel.bulkWrite(docsToUpdateInNetworks);

      const data = relayerContract.interface.encodeFunctionData(
        'initiateNFTDeployment',
        [
          encodedParameters,
          nftDeployDTO.destinationChains,
          gasValuesForContractDeployment,
          nftDeployDTO.tokenMintingChain,
        ],
      );
      return res.status(200).json({
        code: 200,
        message: 'success',
        totalGasFeeInUSDOnMintingChain,
        totalGasFeeInTokenMintingChain,
        chainId: nftDeployDTO.tokenMintingChain,
        salt: saltInBytes32,
        transaction: {
          to: getCATRelayerAddress(+nftDeployDTO.tokenMintingChain),
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
   * @param nftInfoDTO token info dto which contain address and chain ID
   * @param res express response object
   */
  async getNFTInfo(nftInfoDTO: GetNFTInfoDTO, res: Response) {
    try {
      let nftNetworkInfo = await this.NFTNetworksModel.findOne({
        address: { $regex: new RegExp(nftInfoDTO.token, 'i') },
        chainId: nftInfoDTO.chainId,
      })
        .populate({ path: 'nftInfo', model: NFTInfo.name })
        .lean();

      const nftNetworkInfoFromGeneric = await this.NFTNetworksModel.findOne({
        genericTokenAddress: {
          $regex: new RegExp(nftInfoDTO.token, 'i'),
        },
        chainId: nftInfoDTO.chainId,
      })
        .populate({ path: 'nftInfo', model: NFTInfo.name })
        .lean();

      nftNetworkInfo = nftNetworkInfo || nftNetworkInfoFromGeneric;
      let deployedNetworks = [];
      let type = CATType.CATType;
      let nftInfo = null;
      if (!nftNetworkInfo) {
        //: here means its not in our db so we will fetch it from network and will have 2 use cases . either its already burn and mint or its normal token.
        const rpcUrl = getNativeChainBaseRPCUrl(nftInfoDTO.chainId);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const nftContract = await CatERC721__factory.connect(
          nftInfoDTO.token,
          provider,
        );

        const name = await nftContract.name();
        const symbol = await nftContract.symbol();
        let totalSupply = '0';
        try {
          totalSupply = (await nftContract.totalSupply()).toString();
        } catch (error) {}
        // const baseUri = await nftContract.baseURI();
        nftInfo = {
          name,
          symbol,
          totalSupply,
        };
        // this try catch is to check if its CAT20 or not by using supported interface.
        try {
          const isCAT721 = await nftContract.supportsInterface(
            CAT_NFT_INTERFACE_ID,
          );

          let isCAT721Proxy = false;
          if (!isCAT721) {
            isCAT721Proxy = await nftContract.supportsInterface(
              CAT_PROXY_NFT_INTERFACE_ID,
            );

            type = isCAT721Proxy ? CATType.CATProxyType : type;
          }

          type = !isCAT721 && !isCAT721Proxy ? CATType.GENERIC : type;
        } catch (error) {
          // here error means function not found in contract, so it's not CAT20.
          type = CATType.GENERIC;
        } // end of try catch.
      } else {
        const allNFTNetworks = await this.NFTNetworksModel.find({
          nftInfo: nftNetworkInfo.nftInfo,
          status: TokenNetworkDeployStatus.DEPLOYED,
        }).lean();
        type =
          nftNetworkInfo.type === CATType.CATProxyType
            ? CATType.GENERIC
            : nftNetworkInfo.type;
        deployedNetworks = allNFTNetworks.map(
          (tokenNetwork) => tokenNetwork.chainId,
        );

        nftInfo = nftNetworkInfo.nftInfo;
      }
      return res.status(200).json({
        code: 200,
        message: 'success',
        deployedNetworks,
        type,
        nftInfo,
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
  async getAllNFTs(res: Response) {
    try {
      const nfts = await this.NFTInfoModel.aggregate([
        {
          $lookup: {
            from: 'nft_networks',
            localField: '_id',
            foreignField: 'nftInfo',
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
        nfts,
      });
    } catch (error) {
      console.error(error);
      return res.status(400).json({
        message: error.message,
      });
    }
  }
} // end of class
