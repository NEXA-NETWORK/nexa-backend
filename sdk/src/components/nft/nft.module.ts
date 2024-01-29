import { Module } from '@nestjs/common';
import { NftController } from './nft.controller';
import { NftService } from '././nft.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CryptoPrices,
  CryptoPricesSchema,
} from 'entities/crypto.prices.entity';
import { NftBridgeService } from './nft.bridge.service';

import { NFTInfo, NFTInfoSchema } from '../../entities/nfts/nft.info.entity';
import {
  NFTNetworks,
  NFTNetworksSchema,
} from '../../entities/nfts/nft.networks.entity';
import {
  NFTBridgeHistory,
  NFTBridgeHistorySchema,
} from '../../entities/nfts/nft.bridge.history.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CryptoPrices.name, schema: CryptoPricesSchema },
      { name: NFTInfo.name, schema: NFTInfoSchema },
      { name: NFTNetworks.name, schema: NFTNetworksSchema },
      {
        name: NFTBridgeHistory.name,
        schema: NFTBridgeHistorySchema,
      },
    ]),
  ],
  controllers: [NftController],
  providers: [NftService, NftBridgeService],
})
export class NftModule {}
