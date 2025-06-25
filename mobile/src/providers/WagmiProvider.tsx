import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '../config/wagmi';

interface Props {
  children: React.ReactNode;
}

const queryClient = new QueryClient();

export function AppWagmiProvider({ children }: Props) {
  try {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  } catch (error) {
    console.error('WagmiProvider crashed:', error);
    return null; // Or a fallback UI
  }
}