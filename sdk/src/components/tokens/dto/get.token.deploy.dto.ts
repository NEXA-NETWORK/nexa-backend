import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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

export class GetTokenDeployDTO {
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
  @IsNumber()
  @Type(() => Number)
  decimals: number;

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

export class GetTokenInfoDTO {
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

export class GetTokenBridgeDTO {
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
  amount: string;
}

export class GetTokenBridgeStatusDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;
}
