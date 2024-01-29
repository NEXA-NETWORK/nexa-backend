import addresses from '../config/constants/contracts';
import { Address } from '../config/constants/types';
import { SupportedChainId } from '../config/constants/chains';

export const getAddress = (
  address: Address,
  chainId = SupportedChainId.BINANCE,
): string => {
  return address[chainId];
};

export const getMulticallAddress = (chainId) => {
  return getAddress(addresses.multiCall, chainId);
};

export const getCATRelayerAddress = (chainId) => {
  const address = addresses.catRelayer;
  return address[chainId];
};

export const getWordholeBridgeAddress = (chainId) => {
  const address = addresses.wormholeBridge;
  return address[chainId];
};
