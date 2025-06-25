import { defineChain } from 'viem';

// Rootstock Testnet
export const rootstockTestnet = defineChain({
  id: 31,
  name: 'Rootstock Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Test RBTC',
    symbol: 'tRBTC',
  },
  rpcUrls: {
    default: {
      http: ['https://public-node.testnet.rsk.co'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Rootstock Testnet Explorer',
      url: 'https://rootstock-testnet.blockscout.com',
    },
  },
  testnet: true,
});

// Rootstock Mainnet
export const rootstockMainnet = defineChain({
  id: 30,
  name: 'Rootstock Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'RBTC',
    symbol: 'RBTC',
  },
  rpcUrls: {
    default: {
      http: ['https://public-node.rsk.co'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Rootstock Explorer',
      url: 'https://rootstock.blockscout.com',
    },
  },
  testnet: false,
});

// Get current network based on env
export const getCurrentNetwork = () => {
  const network = process.env.EXPO_PUBLIC_NETWORK || 'testnet';
  return network === 'mainnet' ? rootstockMainnet : rootstockTestnet;
};

export const supportedChains = [rootstockTestnet, rootstockMainnet];