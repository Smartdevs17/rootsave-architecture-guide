import { Transaction } from '../services/TransactionService';

export interface WalletState {
  isInitialized: boolean;
  isUnlocked: boolean;
  address: string | null;
  balance: string;
  privateKey: string | null; // Only in memory when unlocked
}

export interface WalletContextType {
  // State
  isInitialized: boolean;
  isUnlocked: boolean;
  address: string | null;
  balance: string;
  privateKey: string | null;

  // Wallet Actions
  generateWallet: () => Promise<string>;
  importWallet: (mnemonic: string) => Promise<void>;
  unlockWallet: () => Promise<boolean>;
  lockWallet: () => void;
  clearWallet: () => Promise<void>;

  // Rootstock Contract Actions
  depositRBTC: (amount: string) => Promise<string>;
  getCurrentYield: () => Promise<string>;
  withdrawAll: () => Promise<string>;
  getUserDeposit: () => Promise<string>;
  getTotalWithdrawable: () => Promise<string>;

  // 👈 NEW: Transaction History Methods
  getTransactionHistory: () => Promise<Transaction[]>;
  getTransactionStats: () => Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    totalYieldEarned: number;
    transactionCount: number;
  } | null>;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
  credentials?: {
    address: string;
    privateKey: string;
  };
}

export interface KeychainItem {
  username: string;
  password: string;
}

export type WalletAction = 
  | { type: 'WALLET_GENERATED'; payload: { address: string } }
  | { type: 'WALLET_UNLOCKED'; payload: { address: string; privateKey: string } }
  | { type: 'WALLET_LOCKED' }
  | { type: 'BALANCE_UPDATED'; payload: { balance: string } };

/**
 * Enhanced wallet credentials that include mnemonic
 */
export interface EnhancedWalletCredentials {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

/**
 * Enhanced biometric result for methods that return mnemonic
 */
export interface EnhancedBiometricResult extends BiometricResult {
  credentials?: EnhancedWalletCredentials;
}

// Export Transaction interface for use throughout the app
export type { Transaction } from '../services/TransactionService';