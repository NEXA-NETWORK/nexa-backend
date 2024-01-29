import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  Response,
} from '@nestjs/common';
import { TokensService } from './tokens.service';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  GetTokenBridgeDTO,
  GetTokenBridgeStatusDTO,
  GetTokenDeployDTO,
  GetTokenInfoDTO,
} from './dto/get.token.deploy.dto';
import { TokensBridgeService } from './tokens.bridge.service';

@ApiTags('tokens')
@Controller('tokens')
export class TokensController {
  constructor(
    private readonly tokensService: TokensService,
    private readonly tokensBridgeService: TokensBridgeService,
  ) {}

  @ApiOperation({
    summary:
      'Get Estimate and Unsigned Transaction For Deploy Token initiate transaction.',
  })
  @Get('deploy')
  async getTokensDeploy(
    @Request() req,
    @Query() tokenDeployDTO: GetTokenDeployDTO,
    @Response() res,
  ) {
    return this.tokensService.getTokensDeploy(req, tokenDeployDTO, res);
  }

  @ApiOperation({ summary: 'Get Tokens Deploy Status' })
  @ApiParam({
    name: 'salt',
    required: true,
    description: 'please use salt from deploy response',
    type: 'string',
  })
  @Get('deploy/status/:salt')
  async getTokensDeployStatus(@Request() req, @Param() salt, @Response() res) {
    return this.tokensService.getTokensDeployStatus(req, salt.salt, res);
  }

  @ApiOperation({ summary: 'Get Token Info' })
  @Get('info')
  async getTokensInfo(
    @Query() getTokenInfoDTO: GetTokenInfoDTO,
    @Response() res,
  ) {
    return this.tokensService.getTokensInfo(getTokenInfoDTO, res);
  }

  @ApiOperation({ summary: 'Get Token Bridge.' })
  @Get('bridge')
  async getTokensBridge(
    @Query() getTokenBridgeDTO: GetTokenBridgeDTO,
    @Response() res,
  ) {
    return this.tokensBridgeService.getTokenBridge(getTokenBridgeDTO, res);
  }

  @ApiOperation({ summary: 'Get Token Bridge Transaction Status.' })
  @Get('bridge/status/:id')
  async getTokensBridgeTxStatus(
    @Param() getTokenBridgeStatusDTO: GetTokenBridgeStatusDTO,
    @Response() res,
  ) {
    return this.tokensBridgeService.getTokensBridgeTxStatus(
      getTokenBridgeStatusDTO,
      res,
    );
  }

  @ApiOperation({ summary: 'Get All Tokens.' })
  @Get('')
  async getAlTokens(@Response() res) {
    return this.tokensService.getAllTokens(res);
  }
}
