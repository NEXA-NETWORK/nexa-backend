import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { TokenInfo } from './token.info.entity';
import { CATType } from '../../config/constants/types';

export enum TokenNetworkDeployStatus {
  QUERIED = 'QUERIED',
  PENDING = 'PENDING',
  DEPLOYED = 'DEPLOYED',
  FAILED = 'FAILED',
  WAITING_FOR_CONFIRMATION = 'WAITING_FOR_CONFIRMATION',
  IN_PROGRESS = 'IN_PROGRESS',
  LOW_FEES = 'LOW_FEES',
}
@Schema({ collection: 'token_networks' })
export class TokenNetworks {
  @Prop()
  address: string;

  @Prop({ required: true })
  chainId: number;

  @Prop({ required: true, default: TokenNetworkDeployStatus.QUERIED })
  status: TokenNetworkDeployStatus;

  @Prop()
  error: string;

  @Prop()
  feePaidByUser: string;

  @Prop({ required: true })
  owner: string;

  @Prop({})
  deploymentTxHash: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'token_infos',
    required: true,
  })
  tokenInfo: TokenInfo;

  @Prop({ required: true })
  type: CATType;

  @Prop({})
  genericTokenAddress: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const TokenNetworksSchema = SchemaFactory.createForClass(TokenNetworks);
export type TokenNetworksDocument = TokenNetworks & Document;
