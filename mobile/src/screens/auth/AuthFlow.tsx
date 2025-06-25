import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import SetupWallet from './SetupWallet';
import BiometricService from '../../services/BiometricService';
import { useEmbeddedWallet } from '../../contexts/EmbeddedWalletContext';
import { getCurrentNetwork } from '../../config/networks';

type AuthState = 'loading' | 'no-wallet' | 'wallet-locked' | 'wallet-unlocked';

interface AuthFlowProps {
  onAuthenticated: () => void; // Navigate to main app
}

/**
 * AuthFlow handles all authentication states and transitions
 */
export default function AuthFlow({ onAuthenticated }: AuthFlowProps) {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const { isUnlocked, address, balance, unlockWallet } = useEmbeddedWallet();
  
  const currentNetwork = getCurrentNetwork();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    // Auto-navigate to main app when wallet is unlocked
    if (isUnlocked) {
      setAuthState('wallet-unlocked');
      onAuthenticated();
    }
  }, [isUnlocked, onAuthenticated]);

  /**
   * Initialize authentication and check wallet status
   */
  const initializeAuth = async () => {
    try {
      console.log('Checking wallet status...');
      
      // Add null check for BiometricService
      if (!BiometricService) {
        console.log('BiometricService not available, setting up new wallet');
        setAuthState('no-wallet');
        return;
      }
      
      const hasWallet = await BiometricService.hasWallet();
      
      if (hasWallet) {
        setAuthState('wallet-locked');
      } else {
        setAuthState('no-wallet');
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      setAuthState('no-wallet'); // Fallback to setup
    }
  };

  /**
   * Handle setup completion
   */
  const handleSetupComplete = () => {
    setAuthState('wallet-locked');
  };

  /**
   * Handle wallet unlock
   */
  const handleUnlock = async () => {
    try {
      console.log('Attempting to unlock wallet...');
      const success = await unlockWallet();
      
      if (success) {
        // State will be updated via useEffect when isUnlocked changes
        console.log('Wallet unlocked successfully');
      } else {
        console.log('Unlock failed or cancelled');
        // Could show error message here
      }
    } catch (error) {
      console.error('Unlock error:', error);
      // Could show error alert here
    }
  };

  /**
   * Render loading screen
   */
  const renderLoading = () => (
    <View style={styles.container}>
      <Text style={styles.title}>Rootsave</Text>
      <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      <Text style={styles.subtitle}>Initializing...</Text>
    </View>
  );

  /**
   * Render wallet unlock screen
   */
  const renderWalletLocked = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Unlock your wallet to continue</Text>
      </View>
      
      <View style={styles.lockIconContainer}>
        <Text style={styles.lockEmoji}>🔒</Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleUnlock}>
          <Text style={styles.buttonText}>Unlock with Biometrics</Text>
        </TouchableOpacity>

        <Text style={styles.networkInfo}>
          Network: {currentNetwork?.name || 'Unknown'}
        </Text>
      </View>
    </View>
  );

  /**
   * Render unlock success screen (brief transition)
   */
  const renderWalletUnlocked = () => (
    <View style={styles.container}>
      <Text style={styles.title}>✅ Authenticated</Text>
      <ActivityIndicator size="large" color="#059669" style={{ marginTop: 20 }} />
      <Text style={styles.subtitle}>Loading your dashboard...</Text>
    </View>
  );

  /**
   * Render current authentication state
   */
  switch (authState) {
    case 'loading':
      return renderLoading();
    
    case 'no-wallet':
      return <SetupWallet onComplete={handleSetupComplete} />;
    
    case 'wallet-locked':
      return renderWalletLocked();
    
    case 'wallet-unlocked':
      return renderWalletUnlocked();
    
    default:
      return renderLoading();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  lockIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockEmoji: {
    fontSize: 80,
  },
  actionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: 280,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  networkInfo: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
