import { useState, useEffect, useCallback } from 'react';
import { WalletService } from '../services/WalletService';
import { Wallet, CreateWalletResponse, ImportWalletParams, AuthState } from '../types';

export const useWallet = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    wallet: null,
    biometricEnabled: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const walletService = WalletService.getInstance();

  // Check if wallet exists on mount
  useEffect(() => {
    checkWalletExists();
  }, []);

  const checkWalletExists = async () => {
    try {
      const hasWallet = await walletService.hasWallet();
      // Note: hasWallet doesn't mean authenticated, just that a wallet is stored
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check wallet');
    }
  };

  const createWallet = useCallback(async (password: string): Promise<CreateWalletResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await walletService.createWallet(password);
      
      if (result.success && result.wallet) {
        setAuthState({
          isAuthenticated: true,
          wallet: result.wallet,
          biometricEnabled: false,
        });
      } else {
        setError(result.error || 'Failed to create wallet');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet';
      setError(errorMessage);
      return {
        wallet: {} as Wallet,
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const importWallet = useCallback(async (params: ImportWalletParams): Promise<CreateWalletResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await walletService.importWallet(params);
      
      if (result.success && result.wallet) {
        setAuthState({
          isAuthenticated: true,
          wallet: result.wallet,
          biometricEnabled: false,
        });
      } else {
        setError(result.error || 'Failed to import wallet');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import wallet';
      setError(errorMessage);
      return {
        wallet: {} as Wallet,
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const unlockWallet = useCallback(async (password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const wallet = await walletService.loadWallet(password);
      
      if (wallet) {
        setAuthState({
          isAuthenticated: true,
          wallet,
          biometricEnabled: false, // Will be updated when biometrics are implemented
        });
        return true;
      } else {
        setError('Invalid password or wallet not found');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unlock wallet';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState({
      isAuthenticated: false,
      wallet: null,
      biometricEnabled: false,
    });
    setError(null);
  }, []);

  const deleteWallet = useCallback(async () => {
    setLoading(true);
    
    try {
      await walletService.deleteWallet();
      await logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete wallet');
    } finally {
      setLoading(false);
    }
  }, [logout]);

  return {
    // State
    authState,
    loading,
    error,
    
    // Actions
    createWallet,
    importWallet,
    unlockWallet,
    logout,
    deleteWallet,
    
    // Utilities
    clearError: () => setError(null),
    isWalletCreated: async () => await walletService.hasWallet(),
  };
};