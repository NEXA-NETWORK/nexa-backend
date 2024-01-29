import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  Response,
} from '@nestjs/common';
import { NftService } from '././nft.service';
import { ApiOperation, ApiParam, ApiTags} from '@nestjs/swagger';
import {
  GetNFTBridgeDTO,
  GetNFTBridgeStatusDTO,
  GetNftDeployDto,
  GetNFTInfoDTO,
} from './dto/get.nft.deploy.dto';
import { NftBridgeService } from './nft.bridge.service';

@ApiTags('nfts')
@Controller('nft')
export class NftController {
  constructor(
    private readonly nftService: NftService,
    private readonly nftBridgeService: NftBridgeService,
  ) {}

  @ApiOperation({
    summary: 'Get Estimate and Unsigned Transaction For Deploy NFT',
  })
  @Get('deploy')
  async getTokensDeploy(
    @Request() req,
    @Query() nftDeployDTO: GetNftDeployDto,
    @Response() res,
  ) {
    return this.nftService.getNFTDeploy(req, nftDeployDTO, res);
  }

  @ApiOperation({ summary: 'Get NFT Deploy Status' })
  @ApiParam({
    name: 'salt',
    required: true,
    description: 'please use salt from deploy response',
    type: 'string',
  })
  @Get('deploy/status/:salt')
  async getTokensDeployStatus(@Request() req, @Param() salt, @Response() res) {
    return this.nftService.getNFTDeployStatus(req, salt.salt, res);
  }

  @ApiOperation({ summary: 'Get Token Info' })
  @Get('info')
  async getTokensInfo(
    @Query() getNFTInfoDTO: GetNFTInfoDTO,
    @Response() res,
  ) {
    return this.nftService.getNFTInfo(getNFTInfoDTO, res);
  }

  @ApiOperation({ summary: 'Get Token Bridge.' })
  @Get('bridge')
  async getTokensBridge(
    @Query() getNFTBridgeDTO: GetNFTBridgeDTO,
    @Response() res,
  ) {
    return this.nftBridgeService.getTokenBridge(getNFTBridgeDTO, res);
  }

  @ApiOperation({ summary: 'Get Token Bridge Transaction Status.' })
  @Get('bridge/status/:id')
  async getTokensBridgeTxStatus(
    @Param() getNFTBridgeStatusDTO: GetNFTBridgeStatusDTO,
    @Response() res,
  ) {
    return this.nftBridgeService.getNFTBridgeTxStatus(
      getNFTBridgeStatusDTO,
      res,
    );
  }

  @ApiOperation({ summary: 'Get All Tokens.' })
  @Get('')
  async getAlTokens(@Response() res) {
    return this.nftService.getAllNFTs(res);
  }
}
