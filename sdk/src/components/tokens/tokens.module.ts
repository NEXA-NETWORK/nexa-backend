import { Module } from '@nestjs/common';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CryptoPrices,
  CryptoPricesSchema,
} from 'entities/crypto.prices.entity';
import { TokenInfo, TokenInfoSchema } from 'entities/tokens/token.info.entity';
import {
  TokenNetworks,
  TokenNetworksSchema,
} from 'entities/tokens/token.networks.entity';
import { TokensBridgeService } from './tokens.bridge.service';
import {
  TokenBridgeHistory,
  TokenBridgeHistorySchema,
} from '../../entities/tokens/token.bridge.history.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CryptoPrices.name, schema: CryptoPricesSchema },
      { name: TokenInfo.name, schema: TokenInfoSchema },
      { name: TokenNetworks.name, schema: TokenNetworksSchema },
      {
        name: TokenBridgeHistory.name,
        schema: TokenBridgeHistorySchema,
      },
    ]),
  ],
  controllers: [TokensController],
  providers: [TokensService, TokensBridgeService],
})
export class TokensModule {}
