import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  GetTokenBridgeDTO,
  GetTokenBridgeStatusDTO,
} from './dto/get.token.deploy.dto';
import { getNativeChainBaseRPCUrl } from 'utils/getRpcUrl';
import { BigNumber, ethers } from 'ethers';
import { CatRelayer__factory } from 'config/abi/types';
import { getCATRelayerAddress } from 'utils/addressHelpers';
import { enhanceGasMargin } from 'utils';
import { TOKEN_BRIDGE_GAS_LIMIT } from 'config/constants';
import {
  COIN_GECKO_IDS,
  WORMHOLE_CHAIN_ID_FROM_NATIVE,
} from 'config/constants/chains';
import { InjectModel } from '@nestjs/mongoose';
import {
  CryptoPrices,
  CryptoPricesDocument,
} from 'entities/crypto.prices.entity';
import { Model } from 'mongoose';
import {
  TokenInfo,
  TokenInfoDocument,
} from 'entities/tokens/token.info.entity';
import {
  TokenNetworks,
  TokenNetworksDocument,
} from 'entities/tokens/token.networks.entity';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { createNonce, tryNativeToHexString } from '@certusone/wormhole-sdk';
import {
  TokenBridgeHistory,
  TokenBridgeHistoryDocument,
} from '../../entities/tokens/token.bridge.history.entity';

@Injectable()
export class TokensBridgeService {
  constructor(
    @InjectModel(CryptoPrices.name)
    private CryptoPricesModel: Model<CryptoPricesDocument>,
    @InjectModel(TokenInfo.name)
    private TokenInfoModel: Model<TokenInfoDocument>,
    @InjectModel(TokenNetworks.name)
    private TokenNetworksModel: Model<TokenNetworksDocument>,
    @InjectModel(TokenBridgeHistory.name)
    private TokenBridgeHistoryModel: Model<TokenBridgeHistoryDocument>,
  ) {
    console.log('In Constructor of NftBridgeService');
  }

  /**
   * API function to get estimate gas for token bridging.
   * @param getTokenBridgeDTO
   * @param res
   */
  async getTokenBridge(getTokenBridgeDTO: GetTokenBridgeDTO, res: Response) {
    try {
      const chainsForBridge = [
        COIN_GECKO_IDS[getTokenBridgeDTO.fromChainId],
        COIN_GECKO_IDS[getTokenBridgeDTO.toChainId],
      ];
      const cryptoRates = await this.CryptoPricesModel.find({
        symbol: { $in: chainsForBridge },
      }).lean();

      const rpcUrl = getNativeChainBaseRPCUrl(+getTokenBridgeDTO.toChainId);
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const gasPrice = await provider.getGasPrice();
      const enhanceGasPrice = enhanceGasMargin(gasPrice, 30);
      let gasFeeInWei = enhanceGasPrice.mul(
        BigNumber.from(TOKEN_BRIDGE_GAS_LIMIT),
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
          cryptoRate.symbol === COIN_GECKO_IDS[+getTokenBridgeDTO.toChainId],
      );
      if (!usdRateForChain) {
        throw Error('No rate found for chain' + +getTokenBridgeDTO.toChainId);
      }

      const gasFeeInNative = +ethers.utils.formatEther(gasFeeInWei);
      const gasFeeInUSD = gasFeeInNative * usdRateForChain.priceInUSD;

      const usdRateForChainToPayFee = cryptoRates.find(
        (cryptoRate) =>
          cryptoRate.symbol === COIN_GECKO_IDS[+getTokenBridgeDTO.fromChainId],
      );
      if (!usdRateForChainToPayFee) {
        throw new Error(
          'No rate found for chain' + +getTokenBridgeDTO.fromChainId,
        );
      }

      const totalGasFeeInTokenSourceChain = +(
        gasFeeInUSD / usdRateForChainToPayFee.priceInUSD
      ).toFixed(18);
      const totalGasFeeInTokenSourceChainInWei = ethers.utils.parseEther(
        totalGasFeeInTokenSourceChain.toString(),
      );

      const rpcUrlForFromChain = getNativeChainBaseRPCUrl(
        +getTokenBridgeDTO.fromChainId,
      );
      const providerFromChain = new ethers.providers.JsonRpcProvider(
        rpcUrlForFromChain,
      );
      const relayerContract = CatRelayer__factory.connect(
        getCATRelayerAddress(+getTokenBridgeDTO.fromChainId),
        providerFromChain,
      );

      const erc20Contract = ERC20__factory.connect(
        getTokenBridgeDTO.fromToken,
        providerFromChain,
      );
      const catRelayerAddress = getCATRelayerAddress(
        +getTokenBridgeDTO.fromChainId,
      );

      const transactions = [];
      const allowance = await erc20Contract.allowance(
        getTokenBridgeDTO.from,
        catRelayerAddress,
      );

      // in case allowance is less than amount, we need to approve first
      if (allowance.lt(getTokenBridgeDTO.amount)) {
        const data = erc20Contract.interface.encodeFunctionData('approve', [
          catRelayerAddress,
          getTokenBridgeDTO.amount,
        ]);
        transactions.push({
          to: getTokenBridgeDTO.fromToken,
          data,
          value: ethers.constants.Zero.toString(),
        });
      } //  end of if

      const bridgeHistoryRecord = await this.TokenBridgeHistoryModel.create({
        fromChainId: getTokenBridgeDTO.fromChainId,
        toChainId: getTokenBridgeDTO.toChainId,
        fromToken: getTokenBridgeDTO.fromToken,
        toToken: getTokenBridgeDTO.toToken,
        from: getTokenBridgeDTO.from,
        to: getTokenBridgeDTO.to,
        amount: getTokenBridgeDTO.amount,
        relayerBridgeFeeInNative: totalGasFeeInTokenSourceChain,
        relayerBridgeFeeInWei: totalGasFeeInTokenSourceChainInWei,
        relayerBridgeFeeInUSD: gasFeeInUSD,
      });

      const genericTokenInfo = await this.TokenNetworksModel.findOne({
        genericTokenAddress: {
          $regex: new RegExp(getTokenBridgeDTO.fromToken, 'i'),
        },
        chainId: +getTokenBridgeDTO.fromChainId,
        address: { $ne: null },
      }).lean();
      if (genericTokenInfo) {
        const recepientChainId =
          WORMHOLE_CHAIN_ID_FROM_NATIVE[+getTokenBridgeDTO.toChainId];
        const toAddressInHexa = tryNativeToHexString(
          getTokenBridgeDTO.to,
          recepientChainId,
        );
        const data = relayerContract.interface.encodeFunctionData(
          'initiateProxyBridgeOut',
          [
            getTokenBridgeDTO.fromToken,
            genericTokenInfo.address,
            getTokenBridgeDTO.amount,
            recepientChainId,
            `0x${toAddressInHexa}`,
            createNonce(),
            bridgeHistoryRecord._id.toString(),
          ],
        );

        transactions.push({
          to: catRelayerAddress,
          data,
          value: totalGasFeeInTokenSourceChainInWei.toString(),
        });
      } else {
        const recepientChainId =
          WORMHOLE_CHAIN_ID_FROM_NATIVE[+getTokenBridgeDTO.toChainId];
        const toAddressInHexa = tryNativeToHexString(
          getTokenBridgeDTO.to,
          recepientChainId,
        );
        const data = relayerContract.interface.encodeFunctionData(
          'initiateBridgeOut',
          [
            getTokenBridgeDTO.fromToken,
            getTokenBridgeDTO.amount,
            recepientChainId,
            `0x${toAddressInHexa}`,
            createNonce(),
            bridgeHistoryRecord._id.toString(),
          ],
        );

        transactions.push({
          to: catRelayerAddress,
          data,
          value: totalGasFeeInTokenSourceChainInWei.toString(),
        });
      }

      return res.status(200).json({
        code: 200,
        message: 'success',
        id: bridgeHistoryRecord._id,
        totalGasFeeInUSD: gasFeeInUSD,
        totalGasFeeInTokenSourceChain,
        totalGasFeeInTokenSourceChainInWei:
          totalGasFeeInTokenSourceChainInWei.toString(),
        transactions,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: error.message,
        code: 500,
      });
    }
  }

  /**
   * API function to get status of token bridging Transaction.
   * @param id
   * @param res
   */
  async getTokensBridgeTxStatus(
    getTokenBridgeStatusDTO: GetTokenBridgeStatusDTO,
    res,
  ) {
    try {
      const transaction = await this.TokenBridgeHistoryModel.findOne({
        _id: getTokenBridgeStatusDTO.id,
      }).lean();
      return res.status(200).json({
        code: 200,
        message: 'success',
        transaction,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: error.message,
        code: 500,
      });
    } // end of catch
  } // end of function
} // end of class
