import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsEthereumAddress,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { Transform, Type } from 'class-transformer';
import { CATType } from '../../../config/constants/types';

export class GetNftDeployDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  symbol: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  totalSupply: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  @Type(() => String)
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value;
    } else {
      return [value];
    }
  })
  destinationChains: string[];

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  tokenMintingChain: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  owner: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  salt: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  baseUri: string;

  @ApiProperty({
    enum: CATType,
  })
  @IsEnum(CATType)
  type: CATType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEthereumAddress()
  genericTokenAddress: string;
}

export class GetNFTInfoDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  chainId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  token: string;
}

export class GetNFTBridgeDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  fromChainId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  fromToken: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  toChainId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  toToken: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  from: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  to: string;

  @ApiProperty()
  @IsString()
  tokenId: string;
}

export class GetNFTBridgeStatusDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;
}
