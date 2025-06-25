import React from 'react';
import { AppWagmiProvider } from './WagmiProvider';
import { EmbeddedWalletProvider } from '../contexts/EmbeddedWalletContext'; // ← Add this import

interface Props {
  children: React.ReactNode;
}

export function AppProviders({ children }: Props) {
  if (typeof children === 'string') {
    console.error('AppProviders received raw string as children:', children);
    return null;
  }

  return (
    <AppWagmiProvider>
      <EmbeddedWalletProvider>
        {children}
      </EmbeddedWalletProvider>
    </AppWagmiProvider>
  );
}