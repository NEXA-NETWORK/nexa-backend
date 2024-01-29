// this file is tracking the token deployment event from the CAT relayer contract and will update the token network status so other cron will deploy token.
import { CronJob } from 'cron';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { TokensDeploymentCronJobService } from './token-deployments/tokens.deployment.cron';
import { TokensBridgeCronJobService } from './token-bridges/tokens.bridge.cron';
import { NFTDeploymentCronJobService } from './nft-deployments/nft.deployment.cron';
import { NFTBridgeCronJobService } from './nft-bridges/nft.bridge.cron';

@Injectable()
export class BlockchainTransactionExecutionCronJobService
  implements OnApplicationBootstrap
{
  private isCronRunning = false; // for cron status

  constructor(
    private readonly tokenDeploymentCronService: TokensDeploymentCronJobService,
    private readonly tokensBridgeCronJobService: TokensBridgeCronJobService,
    private readonly nftDeploymentCronService: NFTDeploymentCronJobService,
    private readonly nftBridgeCronService: NFTBridgeCronJobService,
  ) {}
  /**
   * Start application bootstrap callback from nestjs
   */
  async onApplicationBootstrap() {
    console.log('OnApplicationBootstrap in cron');
    this.startCronJob().start();
  } // end of application bootstrap

  startCronJob(): CronJob {
    // after every minute
    return new CronJob('*/20 *  * * * *', async () => {
      if (!this.isCronRunning) {
        this.isCronRunning = true;
        console.log('Running inside  Blockchain Write Cron JOb');
        await this.tokenDeploymentCronService.execute();
        await this.tokensBridgeCronJobService.execute();
        // // nft
        await this.nftDeploymentCronService.execute();
        await this.nftBridgeCronService.execute();

        this.isCronRunning = false;
      } // end of if for cron running check
    }); // end of cron
  } // end of function for creating cron
} // end of class
