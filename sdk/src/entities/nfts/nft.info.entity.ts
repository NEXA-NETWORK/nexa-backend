import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'nft_infos' })
export class NFTInfo {
  @Prop()
  name: string;

  @Prop()
  symbol: string;

  @Prop()
  baseUri: string;

  @Prop()
  totalSupply: string;

  @Prop()
  owner: string;

  @Prop({ required: true })
  salt: string;

  @Prop()
  params: string;

  @Prop()
  imageUrl: string;

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

export const NFTInfoSchema = SchemaFactory.createForClass(NFTInfo);
export type NFTInfoDocument = NFTInfo & Document;
