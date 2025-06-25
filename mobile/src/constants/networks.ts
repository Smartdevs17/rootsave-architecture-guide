import { NetworkType } from '../types';

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  symbol: string;
  gasPrice: string;
}

export const NETWORKS: Record<NetworkType, NetworkConfig> = {
  testnet: {
    name: 'Rootstock Testnet',
    chainId: 31,
    rpcUrl: 'https://public-node.testnet.rsk.co',
    explorerUrl: 'https://rootstock-testnet.blockscout.com',
    symbol: 'RBTC',
    gasPrice: '65000000', // 65 Mwei
  },
  mainnet: {
    name: 'Rootstock Mainnet',
    chainId: 30,
    rpcUrl: 'https://public-node.rsk.co',
    explorerUrl: 'https://rootstock.blockscout.com',
    symbol: 'RBTC',
    gasPrice: '65000000', // 65 Mwei
  },
};

export const getCurrentNetwork = (): NetworkConfig => {
  const networkType = (process.env.EXPO_PUBLIC_NETWORK as NetworkType) || 'testnet';
  return NETWORKS[networkType];
};