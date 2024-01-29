import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum TokenBridgeStatus {
  QUERIED = 'QUERIED',
  BRIDGE_INITIATED = 'BRIDGE_INITIATED',
  BLOCK_CONFIRMATION = 'BLOCK_CONFIRMATION',
  IN_QUEUE = 'IN_QUEUE',
  LOW_FEES = 'LOW_FEES',
  BRIDGE_COMPLETED = 'BRIDGE_COMPLETED',
  BRIDGE_ERROR = 'BRIDGE_ERROR',
}
@Schema({ collection: 'token_bridge_history' })
export class TokenBridgeHistory {
  @Prop()
  fromChainId: number;

  @Prop()
  fromToken: string;

  @Prop()
  toChainId: number;

  @Prop()
  toToken: string;

  @Prop()
  fromAddress: string;

  @Prop()
  toAddress: string;

  @Prop()
  amount: string;

  @Prop()
  initiateBridgeTxHash: string;

  @Prop()
  wormholeSequence: number;

  @Prop()
  relayerBridgeTxHash: string;

  @Prop()
  relayerBridgeFeeInUSD: string;

  @Prop()
  relayerBridgeFeeInNative: string;

  @Prop()
  relayerBridgeFeeInWei: string;

  @Prop({ default: TokenBridgeStatus.QUERIED })
  status: TokenBridgeStatus;

  @Prop({ default: 0 })
  totalBlockConfirmation: number;

  @Prop({ default: 0 })
  blockConfirmationDone: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  @Prop({ default: 0 })
  errorRetryCount: number;

  @Prop()
  error: string;
}

export const TokenBridgeHistorySchema =
  SchemaFactory.createForClass(TokenBridgeHistory);
export type TokenBridgeHistoryDocument = TokenBridgeHistory & Document;
