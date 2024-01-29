import { ChainId, getSignedVAA } from '@certusone/wormhole-sdk';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';

const WORMHOLE_RPC_HOSTS =
  process.env.IS_MAINNET === '1'
    ? [
        'https://wormhole-v2-mainnet-api.certus.one',
        'https://wormhole.inotel.ro',
        'https://wormhole-v2-mainnet-api.mcf.rocks',
        'https://wormhole-v2-mainnet-api.chainlayer.network',
        'https://wormhole-v2-mainnet-api.staking.fund',
        'https://wormhole-v2-mainnet.01node.com',
      ]
    : ['https://wormhole-v2-testnet-api.certus.one'];

export let CURRENT_WORMHOLE_RPC_HOST = -1;

export const getNextRpcHost = () =>
  ++CURRENT_WORMHOLE_RPC_HOST % WORMHOLE_RPC_HOSTS.length;
export async function getSignedVAAWithRetry(
  emitterChain: ChainId,
  emitterAddress: string,
  sequence: string,
  retryAttempts?: number,
) {
  let result;
  let attempts = 0;
  while (!result) {
    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      result = await getSignedVAA(
        WORMHOLE_RPC_HOSTS[getNextRpcHost()],
        emitterChain,
        emitterAddress,
        sequence,
        {
          transport: NodeHttpTransport(),
        },
      );
    } catch (e) {
      if (retryAttempts !== undefined && attempts > retryAttempts) {
        throw e;
      }
    }
  }
  return result;
}
