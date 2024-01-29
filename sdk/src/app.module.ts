import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TokensModule } from './components/tokens/tokens.module';
import { CryptoExchangeRateCronJobService } from './crons/exchange-rates/crypto.exchange.rates.cron';
import {
  CryptoPrices,
  CryptoPricesSchema,
} from './entities/crypto.prices.entity';
import {
  BlockchainListener,
  BlockchainListenerSchema,
} from 'entities/blockchain.listener.entity';
import { TokensDeploymentInitiateEventTrackerCronJobService } from 'crons/token-deployments/tokens.deployment.initiate.tracker.cron';
import {
  TokenNetworks,
  TokenNetworksSchema,
} from 'entities/tokens/token.networks.entity';
import { TokenInfo, TokenInfoSchema } from 'entities/tokens/token.info.entity';
import { TokensDeploymentCronJobService } from 'crons/token-deployments/tokens.deployment.cron';
import {
  TokenBridgeHistory,
  TokenBridgeHistorySchema,
} from './entities/tokens/token.bridge.history.entity';
import { TokensBridgeInitiateTrackerCronJobService } from './crons/token-bridges/tokens.bridge.initiate.tracker.cron';
import { TokensBridgeCronJobService } from './crons/token-bridges/tokens.bridge.cron';
import { NftModule } from './components/nft/nft.module';
import { BlockchainTransactionExecutionCronJobService } from './crons/blockchain.transactions.cron';
import { NFTDeploymentInitiateEventTrackerCronJobService } from './crons/nft-deployments/nft.deployment.initiate.tracker.cron';
import { NFTInfo, NFTInfoSchema } from './entities/nfts/nft.info.entity';
import {
  NFTNetworks,
  NFTNetworksSchema,
} from './entities/nfts/nft.networks.entity';
import { NFTDeploymentCronJobService } from './crons/nft-deployments/nft.deployment.cron';
import { NFTBridgeInitiateTrackerCronJobService } from './crons/nft-bridges/nft.bridge.initiate.tracker.cron';
import {
  NFTBridgeHistory,
  NFTBridgeHistorySchema,
} from './entities/nfts/nft.bridge.history.entity';
import { NFTBridgeCronJobService } from './crons/nft-bridges/nft.bridge.cron';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

let providers = [];
if (process.env.IS_CRON_JOB_TO_BE_ACTIVE === '1') {
  providers = [
    AppService,
    CryptoExchangeRateCronJobService,
    TokensDeploymentInitiateEventTrackerCronJobService,
    TokensDeploymentCronJobService,
    TokensBridgeInitiateTrackerCronJobService,
    TokensBridgeCronJobService,
    BlockchainTransactionExecutionCronJobService,
    NFTDeploymentInitiateEventTrackerCronJobService,
    NFTDeploymentCronJobService,
    NFTBridgeInitiateTrackerCronJobService,
    NFTBridgeCronJobService,
  ];
} else {
  providers = [AppService];
}
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI_DEV),

    MongooseModule.forFeature([
      { name: CryptoPrices.name, schema: CryptoPricesSchema },
      { name: BlockchainListener.name, schema: BlockchainListenerSchema },
      { name: TokenInfo.name, schema: TokenInfoSchema },
      { name: TokenNetworks.name, schema: TokenNetworksSchema },
      {
        name: TokenBridgeHistory.name,
        schema: TokenBridgeHistorySchema,
      },
      {
        name: NFTInfo.name,
        schema: NFTInfoSchema,
      },
      {
        name: NFTNetworks.name,
        schema: NFTNetworksSchema,
      },
      {
        name: NFTBridgeHistory.name,
        schema: NFTBridgeHistorySchema,
      },
    ]),
    TokensModule,
    NftModule,
  ],
  controllers: [AppController],
  providers: [...providers],
})
export class AppModule {}
