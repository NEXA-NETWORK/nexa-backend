import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { NFTInfo } from './nft.info.entity';
import { CATType } from '../../config/constants/types';
import { TokenNetworkDeployStatus } from '../tokens/token.networks.entity';

@Schema({ collection: 'nft_networks' })
export class NFTNetworks {
  @Prop()
  address: string;

  @Prop()
  chainId: number;

  @Prop({ required: true, default: TokenNetworkDeployStatus.QUERIED })
  status: TokenNetworkDeployStatus;

  @Prop()
  feePaidByUser: string;

  @Prop()
  owner: string;

  @Prop({})
  deploymentTxHash: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'nft_infos',
    required: true,
  })
  nftInfo: NFTInfo;

  @Prop({ required: true })
  type: CATType;

  @Prop({})
  genericTokenAddress: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const NFTNetworksSchema = SchemaFactory.createForClass(NFTNetworks);
export type NFTNetworksDocument = NFTNetworks & Document;
