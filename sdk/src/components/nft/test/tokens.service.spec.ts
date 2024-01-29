import { Test, TestingModule } from '@nestjs/testing';
import { NftService } from '.././nft.service';

describe('TokensService', () => {
  // This is the name of the test suite1                    1 `
  let service: NftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NftService],
    }).compile();

    service = module.get<NftService>(NftService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
