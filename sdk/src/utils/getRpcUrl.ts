import { random } from 'lodash';
import { SupportedChainId } from 'config/constants/chains';

// Array of available nodes to connect to
export const nodes = [
  'https://mainnet.infura.io/v3/26d9e50165034657bd12c7500f67ff78',
  'https://mainnet.infura.io/v3/26d9e50165034657bd12c7500f67ff78',
];

const getNodeUrl = (): string => {
  const randomIndex = random(0, nodes.length - 1);
  return nodes[randomIndex];
};

export default getNodeUrl;

export const getBSCNodeURL = (): string => {
  return 'https://broken-responsive-patina.bsc.quiknode.pro/27b8fdd50b4ae445933c6f716d718138894486e4/';
};

export const getPolygonNodeURL = (): string => {
  return 'https://polygon-mainnet.infura.io/v3/c3b11b22bbf44b869d038a592729c5fe';
};

const avaxNodes = [
  'https://avalanche-mainnet.infura.io/v3/c3b11b22bbf44b869d038a592729c5fe',
];
export const getAvaxNodeUrl = (): string => {
  const randomIndex = random(0, avaxNodes.length - 1);
  return avaxNodes[randomIndex];
};

const fantomNodes = ['https://rpc.ftm.tools/'];
export const getFantomNodeUrl = (): string => {
  const randomIndex = random(0, avaxNodes.length - 1);
  return fantomNodes[randomIndex];
};

export const getETHNodeUrl = (): string => {
  return 'https://mainnet.infura.io/v3/c3b11b22bbf44b869d038a592729c5fe';
};
export const getFujiNodeURL = (): string => {
  return 'https://api.avax-test.network/ext/bc/C/rpc';
};

export const getBinanceTestURL = (): string => {
  return 'https://rpc.ankr.com/bsc_testnet_chapel';
};

export const getPolygonTestURL = (): string => {
  return 'https://polygon-mumbai.infura.io/v3/0ebc202c0e874e10869cc0fcc03807b8';
};

export const getSolanaUrl = (): string => {
  return 'https://solana-mainnet.g.alchemy.com/v2/DDiI3x1BSS09MybvjE2D-6pM2Ywmfl-6';
};
export const getFantomTestNetNodeUrl = (): string => {
  return 'https://rpc.testnet.fantom.network/';
};

export const getGoerliNodeURL = (): string => {
  return 'https://goerli.infura.io/v3/c34605a863e4416289601ae2372b5ac0';
};

export const getArbitrumGoerliNodeURL = (): string => {
  return 'https://arbitrum-goerli.infura.io/v3/c34605a863e4416289601ae2372b5ac0';
};

function getAritrubmNodeURL() {
  return 'https://arbitrum-mainnet.infura.io/v3/c3b11b22bbf44b869d038a592729c5fe\n';
}

function getOptimismEthNodeURL() {
  return 'https://optimism-mainnet.infura.io/v3/c3b11b22bbf44b869d038a592729c5fe';
}

export const getNativeChainBaseRPCUrl = (chainId: SupportedChainId): string => {
  switch (chainId) {
    case SupportedChainId.ETHEREUM:
      return getETHNodeUrl();
    case SupportedChainId.BINANCE:
      return getBSCNodeURL();
    case SupportedChainId.POLYGON:
      return getPolygonNodeURL();
    case SupportedChainId.AVAX:
      return getAvaxNodeUrl();
    case SupportedChainId.FANTOM:
      return getFantomNodeUrl();
    case SupportedChainId.SOLANA:
      return getSolanaUrl();
    case SupportedChainId.FUJI:
      return getFujiNodeURL();
    case SupportedChainId.BSC_TESTNET:
      return getBinanceTestURL();
    case SupportedChainId.POLYGON_MUMBAI:
      return getPolygonTestURL();
    case SupportedChainId.FANTOM_TESTNET:
      return getFantomTestNetNodeUrl();
    case SupportedChainId.GOERLI:
      return getGoerliNodeURL();
    case SupportedChainId.ARBITRUM_GOERLI:
      return getArbitrumGoerliNodeURL();
    case SupportedChainId.ARBITRUM:
      return getAritrubmNodeURL();
    case SupportedChainId.OPTIMISM:
      return getOptimismEthNodeURL();
    default:
      throw new Error('Unsupported chain ' + chainId);
  }
};
