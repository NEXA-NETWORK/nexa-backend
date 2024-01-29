import { SupportedChainId } from './chains';

export const TOKEN_DEPLOY_GAS_LIMIT = 4000000;
export const TOKEN_BRIDGE_GAS_LIMIT = 2500000;

export const NFT_DEPLOY_GAS_LIMIT = 6500000;
export const NFT_BRIDGE_GAS_LIMIT = 550000;

export const CAT_TOKEN_INTERFACE_ID = '0xadf0604b';

export const CAT_PROXY_TOKEN_INTERFACE_ID = '0x18598f5c';

export const CAT_NFT_INTERFACE_ID = '0x3eff4765';

export const CAT_PROXY_NFT_INTERFACE_ID = '0x0d52f55e';

export const getBlockConfirmationForVAA = (
  chainId: SupportedChainId,
): number => {
  switch (chainId) {
    case SupportedChainId.ETHEREUM:
      return 100;
    case SupportedChainId.BINANCE:
      return 100;
    case SupportedChainId.POLYGON:
      return 1000;
    case SupportedChainId.AVAX:
      return 100;
    case SupportedChainId.FANTOM:
      return 100;
    case SupportedChainId.SOLANA:
      return 100;
    case SupportedChainId.FUJI:
      return 1;
    case SupportedChainId.BSC_TESTNET:
      return 1;
    case SupportedChainId.POLYGON_MUMBAI:
      return 1;
    case SupportedChainId.FANTOM_TESTNET:
      return 1;
    case SupportedChainId.GOERLI:
      return 1;
    case SupportedChainId.ARBITRUM_GOERLI:
      return 1;
    case SupportedChainId.ARBITRUM:
      return 100;
    case SupportedChainId.OPTIMISM:
      return 100;
    default:
      throw new Error('Unsupported chain ' + chainId);
  }
};
