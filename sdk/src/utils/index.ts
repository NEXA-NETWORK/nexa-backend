import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import { getAddress } from '@ethersproject/address';

import { BigNumber } from '@ethersproject/bignumber';
import { ethers } from 'ethers';
import { Result } from 'ethers/lib/utils';

const isNumberValid = (value) => {
  const regex = new RegExp('^[0-9]*[.,]?[0-9]*$');
  if (regex.test(value)) {
    return true;
  } else {
    return false;
  }
};

export const numberWithCommas = (x) => {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
  // return x.toLocaleString()
};

// returns the check summed address if the address is valid, otherwise returns false
export function isAddress(value: any): string | false {
  try {
    return getAddress(value);
  } catch {
    return false;
  }
}

// account is not optional
export function getSigner(
  library: Web3Provider,
  account: string,
): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked();
}

// Instead of contract transaction we can send raw transaction directly.
export function getSignerForRawTransactions(
  library: Web3Provider,
): JsonRpcSigner {
  return library.getSigner();
}

// account is optional
export function getProviderOrSigner(
  library: Web3Provider,
  account?: string,
): Web3Provider | JsonRpcSigner {
  return account ? getSigner(library, account) : library;
}

// increasing 10% for gas margin
export function enhanceGasMargin(
  value: BigNumber,
  percentage: number,
): BigNumber {
  return value
    .mul(
      BigNumber.from(percentage * 1000).add(BigNumber.from(percentage * 100)),
    )
    .div(BigNumber.from(percentage * 1000));
}

// encode the parameters.
export function encodeParameters(types: string[], values: string[]): string {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

// decode the parameters.
export function decodeParameters(types: string[], data: string): Result {
  const abi = new ethers.utils.AbiCoder();
  return abi.decode(types, data);
}
