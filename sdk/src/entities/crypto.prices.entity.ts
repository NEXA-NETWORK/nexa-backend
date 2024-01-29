import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'crypto_prices' })
export class CryptoPrices {
  @Prop()
  symbol: string;

  @Prop()
  chainId: number;

  @Prop()
  priceInUSD: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CryptoPricesSchema = SchemaFactory.createForClass(CryptoPrices);
export type CryptoPricesDocument = CryptoPrices & Document;
