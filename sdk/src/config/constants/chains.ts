import {
  CHAIN_ID_AVAX,
  CHAIN_ID_BSC,
  CHAIN_ID_ETH,
  CHAIN_ID_POLYGON,
  CHAIN_ID_SOLANA,
  CHAIN_ID_FANTOM,
  CHAINS,
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_OPTIMISM,
} from '@certusone/wormhole-sdk';

/**
 * List of all the networks supported by the Uniswap Interface
 */

export enum SupportedChainId {
  SOLANA = 101,
  TERRA = 202,
  ETHEREUM = 1,
  ARBITRUM = 42161,
  GOERLI = 5,
  POLYGON = 137,
  BINANCE = 56,
  AVAX = 43114,
  FANTOM = 250,
  TRON = 195,
  FUJI = 43113,
  BSC_TESTNET = 97,
  FANTOM_TESTNET = 4002,
  POLYGON_MUMBAI = 80001,
  ARBITRUM_GOERLI = 421613,
  OPTIMISM = 10,
}

export const WORMHOLE_CHAIN_ID_TO_NATIVE = {
  [CHAINS.solana]: SupportedChainId.SOLANA,
  [CHAINS.ethereum]: SupportedChainId.GOERLI,
  [CHAINS.bsc]: SupportedChainId.BINANCE,
  [CHAINS.polygon]: SupportedChainId.POLYGON,
  [CHAINS.avalanche]: SupportedChainId.AVAX,
  [CHAINS.fantom]: SupportedChainId.FANTOM,
  [CHAINS.bsc]: SupportedChainId.BSC_TESTNET,
  [CHAINS.polygon]: SupportedChainId.POLYGON_MUMBAI,
  [CHAINS.avalanche]: SupportedChainId.FUJI,
  [CHAINS.fantom]: SupportedChainId.FANTOM_TESTNET,
};

export const WORMHOLE_CHAIN_ID_FROM_NATIVE = {
  [SupportedChainId.SOLANA]: CHAIN_ID_SOLANA, // For Now debug
  [SupportedChainId.ETHEREUM]: CHAIN_ID_ETH,
  [SupportedChainId.GOERLI]: CHAIN_ID_ETH,
  [SupportedChainId.AVAX]: CHAIN_ID_AVAX,
  [SupportedChainId.POLYGON]: CHAIN_ID_POLYGON,
  [SupportedChainId.BINANCE]: CHAIN_ID_BSC,
  [SupportedChainId.FANTOM]: CHAIN_ID_FANTOM,
  [SupportedChainId.BSC_TESTNET]: CHAIN_ID_BSC,
  [SupportedChainId.POLYGON_MUMBAI]: CHAIN_ID_POLYGON,
  [SupportedChainId.FUJI]: CHAIN_ID_AVAX,
  [SupportedChainId.FANTOM_TESTNET]: CHAIN_ID_FANTOM,
  [SupportedChainId.ARBITRUM_GOERLI]: CHAIN_ID_ARBITRUM,
  [SupportedChainId.ARBITRUM]: CHAIN_ID_ARBITRUM,
  [SupportedChainId.OPTIMISM]: CHAIN_ID_OPTIMISM,
};

export const COIN_GECKO_IDS = {
  [SupportedChainId.SOLANA]: 'solana',
  [SupportedChainId.ETHEREUM]: 'ethereum',
  [SupportedChainId.BINANCE]: 'binancecoin',
  [SupportedChainId.POLYGON]: 'matic-network',
  [SupportedChainId.AVAX]: 'avalanche-2',
  [SupportedChainId.FANTOM]: 'fantom',
  [SupportedChainId.FANTOM_TESTNET]: 'fantom',
  [SupportedChainId.BSC_TESTNET]: 'binancecoin',
  [SupportedChainId.POLYGON_MUMBAI]: 'matic-network',
  [SupportedChainId.FUJI]: 'avalanche-2',
  [SupportedChainId.GOERLI]: 'ethereum',
  [SupportedChainId.ARBITRUM_GOERLI]: 'ethereum',
  [SupportedChainId.ARBITRUM]: 'ethereum',
  [SupportedChainId.OPTIMISM]: 'ethereum',
};
