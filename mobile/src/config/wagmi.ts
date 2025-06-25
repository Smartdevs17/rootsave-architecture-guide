import { defaultWagmiConfig } from '@reown/appkit-wagmi-react-native';
import { createAppKit } from '@reown/appkit-wagmi-react-native';
import { rootstockTestnet, rootstockMainnet } from './networks';

// Get projectId from env
const projectId = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

// App metadata
const metadata = {
  name: "Rootsave",
  description: "Bitcoin Savings on Rootstock",
  url: "https://rootsave.io",
  icons: ["https://rootsave.io/icon.png"],
  redirect: {
    native: "rootsave://",
    universal: "https://rootsave.io",
  },
};

// Export chains
export const chains = [rootstockTestnet, rootstockMainnet] as const;

// Create wagmi config
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

// Initialize AppKit modal
createAppKit({
  projectId,
  wagmiConfig,
  defaultChain: chains[0],
  enableAnalytics: false,
  metadata,
});

export { projectId, metadata };