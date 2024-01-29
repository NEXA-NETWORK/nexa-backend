import { Test, TestingModule } from '@nestjs/testing';
import { TokensService } from '../tokens.service';

describe('TokensService', () => {
  // This is the name of the test suite1                    1 `
  let service: TokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokensService],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
