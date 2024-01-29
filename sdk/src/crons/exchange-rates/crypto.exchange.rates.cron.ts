import { CronJob } from 'cron';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  CryptoPrices,
  CryptoPricesDocument,
} from 'entities/crypto.prices.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { COIN_GECKO_IDS } from 'config/constants/chains';

@Injectable()
export class CryptoExchangeRateCronJobService
  implements OnApplicationBootstrap
{
  private isCronRunning = false; // for cron status
  private subs = [];
  constructor(
    @InjectModel(CryptoPrices.name)
    private CryptoPricesModel: Model<CryptoPricesDocument>,
  ) {
    console.log('In Constructor of Exchange Rates Cron Job Service');
  }

  /**
   * Start application bootstrap callback from nestjs
   */
  async onApplicationBootstrap() {
    console.log('OnApplicationBootstrap in cron');
    this.startCronJob().start();
  } // end of application bootstrap

  startCronJob(): CronJob {
    // after every hour
    return new CronJob('0 */3 * * * *', async () => {
      if (!this.isCronRunning) {
        this.isCronRunning = true;
        console.log('Running inside exchange Rate Cron JOb');

        try {
          const { data: cryptoPricesResult } = await this.getCryptoRates();
          console.log(cryptoPricesResult);

          for (const cryptoObj of Object.keys(cryptoPricesResult)) {
            await this.CryptoPricesModel.findOneAndUpdate(
              {
                symbol: cryptoObj,
              },
              {
                symbol: cryptoObj,
                priceInUSD: cryptoPricesResult[cryptoObj].usd,
                updatedAt: new Date(),
              },
              {
                upsert: true,
              },
            );
          }
        } catch (err) {
          console.log('inside catch of exchange fetch', err);
        }
        this.isCronRunning = false;
      } // end of if for cron running check
    }); // end of cron
  } // end of function for creating cron

  /**
   * Get crypto live rates from coinlayer
   * @param cryptoList comma separated list of supported coins on coinlayer
   */
  getCryptoRates = async (): Promise<any> => {
    const allKeys = Object.keys(COIN_GECKO_IDS);
    const cryptoListForRates = allKeys
      .map((key) => COIN_GECKO_IDS[key])
      .join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoListForRates}&vs_currencies=usd`;
    return axios.get(url);
  };
} // end of class
