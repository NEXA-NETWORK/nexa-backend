import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum TokenBridgeStatus {
  QUERIED = 'QUERIED',
  BRIDGE_INITIATED = 'BRIDGE_INITIATED',
  IN_QUEUE = 'IN_QUEUE',
  LOW_FEES = 'LOW_FEES',
  BRIDGE_COMPLETED = 'BRIDGE_COMPLETED',
  BRIDGE_ERROR = 'BRIDGE_ERROR',
}
@Schema({ collection: 'nft_bridge_history' })
export class NFTBridgeHistory {
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
  tokenId: string;

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

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  @Prop({ default: 0 })
  errorRetryCount: number;

  @Prop()
  error: string;
}

export const NFTBridgeHistorySchema =
  SchemaFactory.createForClass(NFTBridgeHistory);
export type NFTBridgeHistoryDocument = NFTBridgeHistory & Document;
