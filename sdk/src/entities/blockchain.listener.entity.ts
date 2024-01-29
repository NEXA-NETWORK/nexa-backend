import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlockchainListenerDocument = BlockchainListener & Document;

@Schema({ collection: 'blockchain_listener' })
export class BlockchainListener {
  @Prop()
  symbol: string;

  @Prop()
  block_no: number;

  @Prop()
  created_at: Date;

  @Prop()
  updated_at: Date;
}

export const BlockchainListenerSchema =
  SchemaFactory.createForClass(BlockchainListener);
