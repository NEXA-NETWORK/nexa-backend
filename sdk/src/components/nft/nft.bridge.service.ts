import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { getNativeChainBaseRPCUrl } from 'utils/getRpcUrl';
import { BigNumber, ethers } from 'ethers';
import { CatRelayer__factory } from 'config/abi/types';
import { getCATRelayerAddress } from 'utils/addressHelpers';
import { enhanceGasMargin } from 'utils';
import { NFT_BRIDGE_GAS_LIMIT } from 'config/constants';
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
  ERC20__factory,
  ERC721__factory,
} from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { createNonce, tryNativeToHexString } from '@certusone/wormhole-sdk';
import {
  GetNFTBridgeDTO,
  GetNFTBridgeStatusDTO,
} from './dto/get.nft.deploy.dto';
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
export class NftBridgeService {
  constructor(
    @InjectModel(CryptoPrices.name)
    private CryptoPricesModel: Model<CryptoPricesDocument>,
    @InjectModel(NFTInfo.name)
    private NFTInfoModel: Model<NFTInfoDocument>,
    @InjectModel(NFTNetworks.name)
    private NFTNetworksModel: Model<NFTNetworksDocument>,
    @InjectModel(NFTBridgeHistory.name)
    private NFTBridgeHistoryModel: Model<NFTBridgeHistoryDocument>,
  ) {
    console.log('In Constructor of NftBridgeService');
  }

  /**
   * API function to get estimate gas for token bridging.
   * @param nftBridgeDTO
   * @param res
   */
  async getTokenBridge(nftBridgeDTO: GetNFTBridgeDTO, res: Response) {
    try {
      const chainsForBridge = [
        COIN_GECKO_IDS[nftBridgeDTO.fromChainId],
        COIN_GECKO_IDS[nftBridgeDTO.toChainId],
      ];
      const cryptoRates = await this.CryptoPricesModel.find({
        symbol: { $in: chainsForBridge },
      }).lean();

      const rpcUrl = getNativeChainBaseRPCUrl(+nftBridgeDTO.toChainId);
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const gasPrice = await provider.getGasPrice();
      const enhanceGasPrice = enhanceGasMargin(gasPrice, 30);
      let gasFeeInWei = enhanceGasPrice.mul(
        BigNumber.from(NFT_BRIDGE_GAS_LIMIT),
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
          cryptoRate.symbol === COIN_GECKO_IDS[+nftBridgeDTO.toChainId],
      );
      if (!usdRateForChain) {
        throw Error('No rate found for chain' + +nftBridgeDTO.toChainId);
      }

      const gasFeeInNative = +ethers.utils.formatEther(gasFeeInWei);
      const gasFeeInUSD = gasFeeInNative * usdRateForChain.priceInUSD;

      const usdRateForChainToPayFee = cryptoRates.find(
        (cryptoRate) =>
          cryptoRate.symbol === COIN_GECKO_IDS[+nftBridgeDTO.fromChainId],
      );
      if (!usdRateForChainToPayFee) {
        throw new Error('No rate found for chain' + +nftBridgeDTO.fromChainId);
      }

      const totalGasFeeInTokenSourceChain = +(
        gasFeeInUSD / usdRateForChainToPayFee.priceInUSD
      ).toFixed(18);

      const totalGasFeeInTokenSourceChainStr = this.noExponents(
        totalGasFeeInTokenSourceChain,
      );
      const totalGasFeeInTokenSourceChainInWei = ethers.utils.parseEther(
        totalGasFeeInTokenSourceChainStr,
      );

      const rpcUrlForFromChain = getNativeChainBaseRPCUrl(
        +nftBridgeDTO.fromChainId,
      );
      const providerFromChain = new ethers.providers.JsonRpcProvider(
        rpcUrlForFromChain,
      );
      const relayerContract = CatRelayer__factory.connect(
        getCATRelayerAddress(+nftBridgeDTO.fromChainId),
        providerFromChain,
      );

      const erc721Contract = ERC721__factory.connect(
        nftBridgeDTO.fromToken,
        providerFromChain,
      );
      const catRelayerAddress = getCATRelayerAddress(+nftBridgeDTO.fromChainId);

      const transactions = [];
      const isApprovedForAl = await erc721Contract.isApprovedForAll(
        nftBridgeDTO.from,
        catRelayerAddress,
      );

      // in case allowance is less than amount, we need to approve first
      if (!isApprovedForAl) {
        const data = erc721Contract.interface.encodeFunctionData(
          'setApprovalForAll',
          [catRelayerAddress, true],
        );
        transactions.push({
          to: nftBridgeDTO.fromToken,
          data,
          value: ethers.constants.Zero.toString(),
        });
      } //  end of if

      const bridgeHistoryRecord = await this.NFTBridgeHistoryModel.create({
        fromChainId: nftBridgeDTO.fromChainId,
        toChainId: nftBridgeDTO.toChainId,
        fromToken: nftBridgeDTO.fromToken,
        toToken: nftBridgeDTO.toToken,
        from: nftBridgeDTO.from,
        to: nftBridgeDTO.to,
        tokenId: nftBridgeDTO.tokenId,
        relayerBridgeFeeInNative: totalGasFeeInTokenSourceChain,
        relayerBridgeFeeInWei: totalGasFeeInTokenSourceChainInWei,
        relayerBridgeFeeInUSD: gasFeeInUSD,
      });

      const recepientChainId =
        WORMHOLE_CHAIN_ID_FROM_NATIVE[+nftBridgeDTO.toChainId];
      const toAddressInHexa = tryNativeToHexString(
        nftBridgeDTO.to,
        recepientChainId,
      );

      const genericTokenInfo = await this.NFTNetworksModel.findOne({
        genericTokenAddress: {
          $regex: new RegExp(nftBridgeDTO.fromToken, 'i'),
        },
        address: { $ne: null },
      }).lean();

      if (genericTokenInfo) {
        // here means we need to send proxy call.
        const data = relayerContract.interface.encodeFunctionData(
          'initiateProxyBridgeOutNFT',
          [
            nftBridgeDTO.fromToken,
            genericTokenInfo.address,
            nftBridgeDTO.tokenId,
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
        const data = relayerContract.interface.encodeFunctionData(
          'initiateBridgeOutNFT',
          [
            nftBridgeDTO.fromToken,
            nftBridgeDTO.tokenId,
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
  async getNFTBridgeTxStatus(nftBridgeStatusDTO: GetNFTBridgeStatusDTO, res) {
    try {
      const transaction = await this.NFTBridgeHistoryModel.findOne({
        _id: nftBridgeStatusDTO.id,
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

  noExponents(expNum: any) {
    const data = String(expNum).split(/[eE]/);
    if (data.length == 1) return data[0];

    let z = '';
    const sign = expNum < 0 ? '-' : '';
    const str = data[0].replace('.', '');
    let mag = Number(data[1]) + 1;

    if (mag < 0) {
      z = sign + '0.';
      while (mag++) z += '0';
      return z + str.replace(/^/, '');
    }
    mag -= str.length;
    while (mag--) z += '0';
    return str + z;
  }
} // end of class
