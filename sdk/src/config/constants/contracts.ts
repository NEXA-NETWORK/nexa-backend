import { SupportedChainId } from './chains';

export default {
  multiCall: {
    [SupportedChainId.ETHEREUM]: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    4: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    [SupportedChainId.BINANCE]: '0xfF6FD90A470Aaa0c1B8A54681746b07AcdFedc9B',
    97: '0x8F3273Fb89B075b1645095ABaC6ed17B2d4Bc576',
    [SupportedChainId.POLYGON]: '0x275617327c958bD06b5D6b871E7f491D76113dd8',
    [SupportedChainId.AVAX]: '0x8755b94F88D120AB2Cc13b1f6582329b067C760d',
    [SupportedChainId.FANTOM]: '0xD98e3dBE5950Ca8Ce5a4b59630a5652110403E5c',
  },
  catRelayer: {
    [SupportedChainId.FUJI]: '',
    [SupportedChainId.BSC_TESTNET]:
      '',
    [SupportedChainId.POLYGON_MUMBAI]:
      '',
    [SupportedChainId.FANTOM_TESTNET]:
      '',
    [SupportedChainId.GOERLI]: '',
    [SupportedChainId.ARBITRUM_GOERLI]:
      '',

    // MAINNET
    [SupportedChainId.ETHEREUM]: '0x9A82776580aB1511C7aFF2Bf8eD3551d9c97Ecda',
    [SupportedChainId.BINANCE]: '0x9A82776580aB1511C7aFF2Bf8eD3551d9c97Ecda',
    [SupportedChainId.POLYGON]: '0x9A82776580aB1511C7aFF2Bf8eD3551d9c97Ecda',
    [SupportedChainId.AVAX]: '0x9A82776580aB1511C7aFF2Bf8eD3551d9c97Ecda',
    [SupportedChainId.FANTOM]: '0x9A82776580aB1511C7aFF2Bf8eD3551d9c97Ecda',
    [SupportedChainId.ARBITRUM]: '0x9A82776580aB1511C7aFF2Bf8eD3551d9c97Ecda',
    [SupportedChainId.OPTIMISM]: '0x9A82776580aB1511C7aFF2Bf8eD3551d9c97Ecda',
  },

  wormholeBridge: {
    [SupportedChainId.ETHEREUM]: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
    [SupportedChainId.ARBITRUM]: '0xa5f208e072434bC67592E4C49C1B991BA79BCA46',
    [SupportedChainId.BINANCE]: '0x98f3c9e6E3fAce36bAAd05FE09d375Ef1464288B',
    [SupportedChainId.POLYGON]: '0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7',
    [SupportedChainId.AVAX]: '0x54a8e5f9c4CbA08F9943965859F6c34eAF03E26c',
    [SupportedChainId.FANTOM]: '0x126783A6Cb203a3E35344528B26ca3a0489a1485',
    [SupportedChainId.OPTIMISM]: '0xEe91C335eab126dF5fDB3797EA9d6aD93aeC9722',
    [SupportedChainId.SOLANA]: 'worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth',

    [SupportedChainId.FUJI]: '0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C',
    [SupportedChainId.BSC_TESTNET]:
      '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
    [SupportedChainId.POLYGON_MUMBAI]:
      '0x0CBE91CF822c73C2315FB05100C2F714765d5c20',
    [SupportedChainId.FANTOM_TESTNET]:
      '0x1BB3B4119b7BA9dfad76B0545fb3F531383c3bB7',
    [SupportedChainId.GOERLI]: '0x706abc4E45D419950511e474C7B9Ed348A4a716c',
    [SupportedChainId.ARBITRUM_GOERLI]:
      '0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e',
  },
};
