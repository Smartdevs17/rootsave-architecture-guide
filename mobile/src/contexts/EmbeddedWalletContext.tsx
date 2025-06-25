import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { WalletState, WalletContextType, WalletAction } from '../types/wallet';
import BiometricService from '../services/BiometricService';
import { getContractAddress, ROOTSAVE_ABI } from '../constants/contracts';
import { getCurrentNetwork } from '../constants/networks';
import { 
  generateRandomWallet, 
  generateWalletFromMnemonic, 
  calculateYieldAmount, 
  getCurrentTimestamp,
  formatBalance,
  parseRBTC
} from '../utils/walletUtils';
import { TransactionService, Transaction } from '../services/TransactionService';

/**
 * Wallet state reducer
 */
function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'WALLET_GENERATED':
      return {
        ...state,
        isInitialized: true,
        address: action.payload.address,
      };
    
    case 'WALLET_UNLOCKED':
      return {
        ...state,
        isUnlocked: true,
        address: action.payload.address,
        privateKey: action.payload.privateKey,
      };
    
    case 'WALLET_LOCKED':
      return {
        ...state,
        isUnlocked: false,
        privateKey: null, // Clear from memory
      };
    
    case 'BALANCE_UPDATED':
      return {
        ...state,
        balance: action.payload.balance,
      };
    
    default:
      return state;
  }
}

/**
 * Initial wallet state
 */
const initialState: WalletState = {
  isInitialized: false,
  isUnlocked: false,
  address: null,
  balance: '0',
  privateKey: null,
};

/**
 * Wallet context
 */
const EmbeddedWalletContext = createContext<WalletContextType | null>(null);

/**
 * Get current network and contract configuration
 */
const getNetworkConfig = () => {
  const network = getCurrentNetwork();
  const contractAddress = getContractAddress();
  
  return {
    rpcUrl: network.rpcUrl,
    contractAddress,
    chainId: network.chainId,
    gasPrice: network.gasPrice,
  };
};

/**
 * EmbeddedWalletProvider component
 */
interface EmbeddedWalletProviderProps {
  children: React.ReactNode;
}

export function EmbeddedWalletProvider({ children }: EmbeddedWalletProviderProps) {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  /**
   * Initialize provider and check for existing wallet
   */
  useEffect(() => {
    initializeWallet();
  }, []);

  /**
   * Auto-lock wallet when app goes to background
   */
  useEffect(() => {
    // TODO: Add app state listener to auto-lock wallet
    // AppState.addEventListener('change', handleAppStateChange);
  }, []);

  /**
   * Initialize wallet on app start
   */
  const initializeWallet = useCallback(async () => {
    try {
      console.log('🔍 Checking for existing wallet...');
      const hasWallet = await BiometricService.hasWallet();
      
      if (hasWallet) {
        console.log('✅ Existing wallet found');
        // Wallet exists but is locked
        dispatch({ 
          type: 'WALLET_GENERATED', 
          payload: { address: 'stored' } // We'll get real address on unlock
        });
      } else {
        console.log('❌ No existing wallet found');
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      // Gracefully handle errors - don't break the app
    }
  }, []);

  // Improved generateWallet and importWallet functions for your EmbeddedWalletContext.tsx

/**
 * Generate new wallet - IMPROVED ERROR HANDLING
 */
const generateWallet = useCallback(async (): Promise<string> => {
  try {
    console.log('🔧 Generating new wallet...');
    const wallet = generateRandomWallet();
    
    // Store with biometric protection with better error handling
    console.log('🔧 EmbeddedWalletContext: Attempting to store new wallet...');
    const result = await BiometricService.storeWalletWithBiometrics(
      wallet.privateKey,
      wallet.address,
      wallet.mnemonic
    );

    if (!result.success) {
      const errorMessage = result.error || 'Failed to store wallet securely';
      console.error('❌ EmbeddedWalletContext: Storage failed:', errorMessage);
      
      // Provide more helpful error messages
      if (errorMessage.includes('Failed to store wallet credentials')) {
        throw new Error('Unable to securely store your wallet. Please ensure your device has screen lock, PIN, or biometric authentication enabled in settings.');
      } else {
        throw new Error(errorMessage);
      }
    }

    console.log('✅ Wallet generated and stored:', wallet.address);
    dispatch({ 
      type: 'WALLET_GENERATED', 
      payload: { address: wallet.address } 
    });

    return wallet.mnemonic;
  } catch (error) {
    console.error('Failed to generate wallet:', error);
    
    // Re-throw with preserved or improved error message
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to generate wallet. Please ensure your device has security features enabled.');
    }
  }
}, []);

/**
 * Import wallet from mnemonic - IMPROVED ERROR HANDLING
 */
const importWallet = useCallback(async (mnemonic: string): Promise<void> => {
  try {
    console.log('📥 Importing wallet from mnemonic...');
    const wallet = generateWalletFromMnemonic(mnemonic);
    
    // Store with biometric protection with better error handling
    console.log('🔧 EmbeddedWalletContext: Attempting to store imported wallet...');
    const result = await BiometricService.storeWalletWithBiometrics(
      wallet.privateKey,
      wallet.address,
      mnemonic
    );

    if (!result.success) {
      const errorMessage = result.error || 'Failed to store wallet securely';
      console.error('❌ EmbeddedWalletContext: Storage failed:', errorMessage);
      
      // Provide more helpful error messages
      if (errorMessage.includes('Failed to store wallet credentials')) {
        throw new Error('Unable to securely store your wallet. Please ensure your device has screen lock, PIN, or biometric authentication enabled in settings.');
      } else {
        throw new Error(errorMessage);
      }
    }

    console.log('✅ Wallet imported and stored:', wallet.address);
    dispatch({ 
      type: 'WALLET_GENERATED', 
      payload: { address: wallet.address } 
    });
  } catch (error) {
    console.error('Failed to import wallet:', error);
    
    // Re-throw with preserved or improved error message  
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to import wallet. Please check your recovery phrase and device security settings.');
    }
  }
}, []);
  /**
   * Unlock wallet with biometric authentication
   */
  const unlockWallet = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔓 Attempting to unlock wallet...');
      const result = await BiometricService.authenticateAndGetWallet();
      
      if (!result.success || !result.credentials) {
        console.error('Authentication failed:', result.error);
        return false;
      }

      console.log('✅ Wallet unlocked successfully');
      dispatch({
        type: 'WALLET_UNLOCKED',
        payload: {
          address: result.credentials.address,
          privateKey: result.credentials.privateKey,
        },
      });

      // Fetch balance after unlock
      await fetchBalance(result.credentials.address);
      
      return true;
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      return false;
    }
  }, []);

  /**
   * Lock wallet (clear private key from memory)
   */
  const lockWallet = useCallback(() => {
    dispatch({ type: 'WALLET_LOCKED' });
  }, []);

  /**
   * Fetch wallet balance from Rootstock
   */
  const fetchBalance = useCallback(async (address?: string) => {
    try {
      const walletAddress = address || state.address;
      if (!walletAddress) return;

      const config = getNetworkConfig();
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      const balance = await provider.getBalance(walletAddress);
      
      dispatch({
        type: 'BALANCE_UPDATED',
        payload: { balance: balance.toString() },
      });
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [state.address]);

/**
   * Get contract instance for transactions - FIXED VERSION WITH DEBUGGING
   */
  const getContract = useCallback(() => {
    if (!state.privateKey) {
      throw new Error('Wallet not unlocked');
    }

    // 🔍 DEBUG: Log private key details
    console.log('🔧 getContract: Checking private key format...');
    console.log('🔧 Private key type:', typeof state.privateKey);
    console.log('🔧 Private key length:', state.privateKey.length);
    console.log('🔧 Private key starts with 0x:', state.privateKey.startsWith('0x'));
    console.log('🔧 Private key (first 10 chars):', state.privateKey.substring(0, 10));
    console.log('🔧 Private key (last 10 chars):', state.privateKey.substring(state.privateKey.length - 10));

    try {
      const config = getNetworkConfig();
      const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      
      // 🛠️ FIX: Ensure private key is properly formatted
      let formattedPrivateKey = state.privateKey.trim();
      
      // Add 0x prefix if missing
      if (!formattedPrivateKey.startsWith('0x')) {
        console.log('🔧 Adding 0x prefix to private key');
        formattedPrivateKey = '0x' + formattedPrivateKey;
      }
      
      // 🛠️ FIX: Handle length issues by truncating to correct length
      if (formattedPrivateKey.length > 66) {
        console.log(`🔧 Private key too long (${formattedPrivateKey.length}), truncating to 66 characters`);
        formattedPrivateKey = formattedPrivateKey.substring(0, 66);
        console.log('🔧 Truncated private key length:', formattedPrivateKey.length);
      } else if (formattedPrivateKey.length < 66) {
        throw new Error(`Invalid private key length: ${formattedPrivateKey.length}, too short (expected 66)`);
      }
      
      // Check if it's valid hex
      const hexPattern = /^0x[a-fA-F0-9]{64}$/;
      if (!hexPattern.test(formattedPrivateKey)) {
        throw new Error('Private key contains invalid characters or wrong format');
      }
      
      console.log('✅ getContract: Private key format validated, length:', formattedPrivateKey.length);
      const wallet = new ethers.Wallet(formattedPrivateKey, provider);
      
      return new ethers.Contract(config.contractAddress, ROOTSAVE_ABI, wallet);
    } catch (error) {
      console.error('❌ getContract: Failed to create contract:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create contract instance: ${error.message}`);
      } else {
        throw new Error('Failed to create contract instance: Unknown error');
      }
    }
  }, [state.privateKey]);
  /**
   * Deposit RBTC to savings contract
   */
  const depositRBTC = useCallback(async (amount: string): Promise<string> => {
    try {
      if (!state.isUnlocked || !state.address) {
        throw new Error('Wallet not unlocked');
      }

      console.log(`💰 Starting deposit of ${amount} RBTC...`);
      
      // Record pending transaction first
      const pendingTransaction = await TransactionService.recordTransaction(
        state.address,
        'deposit',
        amount,
        undefined,
        `Deposit ${amount} RBTC to savings`
      );
      
      // Update to pending status
      await TransactionService.updateTransactionStatus(
        state.address,
        pendingTransaction.id,
        'pending'
      );

      const contract = getContract();
      const config = getNetworkConfig();
      const weiAmount = parseRBTC(amount);
      
      console.log('📡 Broadcasting transaction to Rootstock...');
      const transaction = await contract.deposit({
        value: weiAmount,
        gasLimit: 100000,
        gasPrice: config.gasPrice,
      });

      console.log(`✅ Transaction broadcasted: ${transaction.hash}`);
      
      // Update with transaction hash
      await TransactionService.updateTransactionStatus(
        state.address,
        pendingTransaction.id,
        'pending',
        transaction.hash
      );

      console.log('⏳ Waiting for confirmation...');
      await transaction.wait();
      
      // Update to completed status
      await TransactionService.updateTransactionStatus(
        state.address,
        pendingTransaction.id,
        'completed',
        transaction.hash
      );

      console.log('🎉 Deposit confirmed and recorded!');
      
      // Refresh balance
      await fetchBalance();
      
      return transaction.hash;
    } catch (error) {
      console.error('❌ Deposit failed:', error);
      
      // If we have a pending transaction, mark it as failed
      if (state.address) {
        try {
          const transactions = await TransactionService.getTransactions(state.address);
          const pendingTx = transactions.find(tx => 
            tx.type === 'deposit' && 
            tx.amount === amount && 
            tx.status === 'pending' &&
            Date.now() - tx.timestamp < 300000 // Within last 5 minutes
          );
          
          if (pendingTx) {
            await TransactionService.updateTransactionStatus(
              state.address,
              pendingTx.id,
              'failed'
            );
          }
        } catch (recordError) {
          console.error('Failed to update failed transaction:', recordError);
        }
      }
      
      throw error;
    }
  }, [state.isUnlocked, state.address, getContract, fetchBalance]);

  /**
   * Get current yield amount
   */
  const getCurrentYield = useCallback(async (): Promise<string> => {
    try {
      if (!state.address) {
        return '0';
      }

      const contract = getContract();
      console.log('🔍 Fetching current yield for address:', state.address);
      const yieldAmount = await contract.getCurrentYield(state.address);
      
      return yieldAmount.toString();
    } catch (error) {
      console.error('Failed to get yield:', error);
      return '0';
    }
  }, [state.address, getContract]);

  /**
   * Get user deposit information
   */
  const getUserDeposit = useCallback(async (): Promise<string> => {
    try {
      if (!state.address) {
        return '0';
      }

      const contract = getContract();
      const deposit = await contract.getUserDeposit(state.address);
      
      return deposit.toString();
    } catch (error) {
      console.error('Failed to get user deposit:', error);
      return '0';
    }
  }, [state.address, getContract]);

  /**
   * Get total withdrawable amount (principal + yield)
   */
  const getTotalWithdrawable = useCallback(async (): Promise<string> => {
    try {
      if (!state.address) {
        return '0';
      }

      const contract = getContract();
      const total = await contract.getTotalWithdrawable(state.address);
      
      return total.toString();
    } catch (error) {
      console.error('Failed to get total withdrawable:', error);
      return '0';
    }
  }, [state.address, getContract]);

  /**
   * Withdraw all funds
   */
  const withdrawAll = useCallback(async (): Promise<string> => {
    try {
      if (!state.isUnlocked || !state.address) {
        throw new Error('Wallet not unlocked');
      }

      console.log('💸 Starting withdrawal of all funds...');
      
      // Get total withdrawable amount first
      const totalWithdrawable = await getTotalWithdrawable();
      const withdrawableRBTC = (parseFloat(totalWithdrawable) / Math.pow(10, 18)).toString();
      
      if (parseFloat(withdrawableRBTC) <= 0) {
        throw new Error('No funds available to withdraw');
      }

      // Record pending transaction
      const pendingTransaction = await TransactionService.recordTransaction(
        state.address,
        'withdraw',
        withdrawableRBTC,
        undefined,
        `Withdraw all funds (${withdrawableRBTC} RBTC)`
      );
      
      // Update to pending status
      await TransactionService.updateTransactionStatus(
        state.address,
        pendingTransaction.id,
        'pending'
      );

      const contract = getContract();
      const config = getNetworkConfig();
      
      console.log('📡 Broadcasting withdrawal transaction...');
      const transaction = await contract.withdraw({
        gasLimit: 150000,
        gasPrice: config.gasPrice,
      });

      console.log(`✅ Withdrawal broadcasted: ${transaction.hash}`);
      
      // Update with transaction hash
      await TransactionService.updateTransactionStatus(
        state.address,
        pendingTransaction.id,
        'pending',
        transaction.hash
      );

      console.log('⏳ Waiting for confirmation...');
      await transaction.wait();
      
      // Update to completed status
      await TransactionService.updateTransactionStatus(
        state.address,
        pendingTransaction.id,
        'completed',
        transaction.hash
      );

      console.log('🎉 Withdrawal confirmed and recorded!');
      
      // Refresh balance
      await fetchBalance();
      
      return transaction.hash;
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      
      // Mark transaction as failed if we have a pending one
      if (state.address) {
        try {
          const transactions = await TransactionService.getTransactions(state.address);
          const pendingTx = transactions.find(tx => 
            tx.type === 'withdraw' && 
            tx.status === 'pending' &&
            Date.now() - tx.timestamp < 300000 // Within last 5 minutes
          );
          
          if (pendingTx) {
            await TransactionService.updateTransactionStatus(
              state.address,
              pendingTx.id,
              'failed'
            );
          }
        } catch (recordError) {
          console.error('Failed to update failed transaction:', recordError);
        }
      }
      
      throw error;
    }
  }, [state.isUnlocked, state.address, getContract, fetchBalance, getTotalWithdrawable]);

  /**
   * Record yield earnings automatically
   */
  const recordYieldEarnings = useCallback(async () => {
    try {
      if (!state.address) return;
      
      const currentYield = await getCurrentYield();
      const yieldRBTC = (parseFloat(currentYield) / Math.pow(10, 18)).toString();
      
      // Record yield if significant
      await TransactionService.recordYieldEarning(state.address, yieldRBTC);
    } catch (error) {
      console.error('Failed to record yield earnings:', error);
    }
  }, [state.address, getCurrentYield]);

  /**
   * Get transaction history
   */
  const getTransactionHistory = useCallback(async (): Promise<Transaction[]> => {
    try {
      if (!state.address) return [];
      return await TransactionService.getTransactions(state.address);
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }, [state.address]);

  /**
   * Get transaction statistics
   */
  const getTransactionStats = useCallback(async () => {
    try {
      if (!state.address) return null;
      return await TransactionService.getTransactionStats(state.address);
    } catch (error) {
      console.error('Failed to get transaction stats:', error);
      return null;
    }
  }, [state.address]);

  /**
   * Clear wallet with transaction cleanup
   */
  const clearWallet = useCallback(async (): Promise<void> => {
    try {
      console.log('🗑️ Clearing wallet and transaction history...');
      
      // Clear transaction history if we have an address
      if (state.address) {
        await TransactionService.clearTransactions(state.address);
      }
      
      // Clear from BiometricService/secure storage
      await BiometricService.clearWalletData();
      
      // Reset state to initial values
      dispatch({ type: 'WALLET_LOCKED' });
      
      // Reset to completely uninitialized state
      state.isInitialized = false;
      state.address = null;
      state.balance = '0';
      
      console.log('✅ Wallet and transaction data cleared successfully');
    } catch (error) {
      console.error('Failed to clear wallet:', error);
      throw error;
    }
  }, [state.address]);

  /**
   * Auto-record yield earnings periodically
   */
  useEffect(() => {
    if (!state.isUnlocked || !state.address) return;
    
    // Record yield earnings every hour
    const yieldInterval = setInterval(recordYieldEarnings, 3600000); // 1 hour
    
    return () => clearInterval(yieldInterval);
  }, [state.isUnlocked, state.address, recordYieldEarnings]);

  /**
   * Context value
   */
  const contextValue: WalletContextType = {
    // State
    isInitialized: state.isInitialized,
    isUnlocked: state.isUnlocked,
    address: state.address,
    balance: state.balance,
    privateKey: state.privateKey,
    
    // Actions
    generateWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    clearWallet,
    
    // Rootstock specific
    depositRBTC,
    getCurrentYield,
    withdrawAll,
    getUserDeposit,
    getTotalWithdrawable,

    // New transaction methods
    getTransactionHistory,
    getTransactionStats,
  };

  return (
    <EmbeddedWalletContext.Provider value={contextValue}>
      {children}
    </EmbeddedWalletContext.Provider>
  );
}

/**
 * Hook to use wallet context
 */
export function useEmbeddedWallet(): WalletContextType {
  const context = useContext(EmbeddedWalletContext);

  if (!context) {
    // Log error instead of throwing to prevent string rendering issues
    console.error('❌ useEmbeddedWallet called outside provider!');
    console.error('Make sure component is wrapped in EmbeddedWalletProvider');
    
    // Return safe default instead of throwing
    return {
      // State
      isInitialized: false,
      isUnlocked: false,
      address: null,
      balance: '0',
      privateKey: null,

      // Actions - safe fallbacks
      generateWallet: async () => {
        console.warn('generateWallet called before provider ready');
        throw new Error('Wallet provider not ready');
      },
      importWallet: async () => {
        console.warn('importWallet called before provider ready');
        throw new Error('Wallet provider not ready');
      },
      unlockWallet: async () => {
        console.warn('unlockWallet called before provider ready');
        return false;
      },
      lockWallet: () => {
        console.warn('lockWallet called before provider ready');
      },
      clearWallet: async () => {
        console.warn('clearWallet called before provider ready');
        throw new Error('Wallet provider not ready');
      },

      // Rootstock specific - safe fallbacks
      depositRBTC: async () => {
        console.warn('depositRBTC called before provider ready');
        throw new Error('Wallet provider not ready');
      },
      getCurrentYield: async () => {
        console.warn('getCurrentYield called before provider ready');
        return '0';
      },
      withdrawAll: async () => {
        console.warn('withdrawAll called before provider ready');
        throw new Error('Wallet provider not ready');
      },
      getUserDeposit: async () => {
        console.warn('getUserDeposit called before provider ready');
        return '0';
      },
      getTotalWithdrawable: async () => {
        console.warn('getTotalWithdrawable called before provider ready');
        return '0';
      },

      // 👇 ADD THESE FALLBACKS
      getTransactionHistory: async () => {
        console.warn('getTransactionHistory called before provider ready');
        return [];
      },
      getTransactionStats: async () => {
        console.warn('getTransactionStats called before provider ready');
        return null;
      },
    };
  }

  return context;
}

export default EmbeddedWalletContext;