import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'token_infos' })
export class TokenInfo {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  decimals: number;

  @Prop({ required: true })
  totalSupply: string;

  @Prop({ required: true })
  owner: string;

  @Prop({ required: true, unique: true })
  salt: string;

  @Prop()
  params: string;

  @Prop({ required: true })
  tokenMintChainId: number;

  @Prop({ required: true })
  feeForPaymentChainId: number;

  @Prop()
  initiatedDeploymentTxHash: string;

  @Prop()
  initiatedDeploymentFeeOnChainId: number;

  @Prop({
    description:
      'this is wei value for contract deployment on respective chain and this is one on one mapping with destinationChains array.',
  })
  gasValuesForContractDeployment: string[];

  @Prop({
    description:
      'this is gas price for contract deployment on respective chain and this is one on one mapping with destinationChains array.',
  })
  gasPricesForContractDeployment: string[];

  @Prop()
  totalGasFeeInUSDOnFeePaymentChain: number;

  @Prop()
  totalGasFeeOnFeePaymentChain: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const TokenInfoSchema = SchemaFactory.createForClass(TokenInfo);
export type TokenInfoDocument = TokenInfo & Document;
