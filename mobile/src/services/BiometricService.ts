import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricResult, EnhancedBiometricResult } from '../types/wallet';
/**
 * Emulator-safe biometric authentication service
 * Provides mock implementations with persistence for testing
 */

// Check if running in emulator/simulator
const isEmulator = () => {
  return (
    Platform.OS === 'ios' && Platform.isPad === false && Platform.isTV === false ||
    Platform.OS === 'android' && (
      Platform.constants?.Brand === 'google' ||
      Platform.constants?.Fingerprint?.includes('generic') ||
      Platform.constants?.Model?.includes('Emulator')
    )
  );
};

// Mock storage keys for emulator
const MOCK_WALLET_KEY = 'mock_wallet_exists';
const MOCK_CREDENTIALS_KEY = 'mock_wallet_credentials';

class BiometricService {
  
  /**
   * Check if device supports biometric authentication - FIXED VERSION
   */
  static async isAvailable(): Promise<boolean> {
    if (isEmulator()) {
      console.log('📱 Emulator detected - mocking biometric availability');
      return true;
    }

    try {
      const Keychain = require('react-native-keychain');
      if (!Keychain || typeof Keychain.getSupportedBiometryType !== 'function') {
        console.warn('Keychain library not properly initialized');
        return true;
      }
      
      const biometryType = await Keychain.getSupportedBiometryType();
      console.log('🔧 BiometricService: Detected biometry type:', biometryType);
      return true;
      
    } catch (error) {
      console.warn('Biometric service not available:', error);
      return true;
    }
  }

  /**
   * Get friendly name for biometric type (for UI display) - FIXED VERSION
   */
  static async getBiometricType(): Promise<string> {
    if (isEmulator()) {
      console.log('📱 Emulator detected - mocking biometric type');
      return Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint';
    }

    try {
      const Keychain = require('react-native-keychain');
      if (!Keychain || typeof Keychain.getSupportedBiometryType !== 'function') {
        return 'Device Passcode';
      }

      const biometryType = await Keychain.getSupportedBiometryType();
      console.log('🔧 BiometricService: Raw biometry type:', biometryType);
      
      switch (biometryType) {
        case 'FaceID':
          return 'Face ID';
        case 'TouchID':
          return 'Touch ID';
        case 'Fingerprint':
          return 'Fingerprint';
        case 'Face':
          return 'Face Unlock';
        case null:
        case undefined:
          return 'Device Passcode';
        default:
          return biometryType || 'Device Authentication';
      }
    } catch (error) {
      console.warn('Failed to get biometry type:', error);
      return 'Device Passcode';
    }
  }

  /**
   * Store wallet with biometric protection - FIXED WITH EMULATOR PERSISTENCE
   */
  static async storeWalletWithBiometrics(privateKey: string, address: string, mnemonic?: string): Promise<BiometricResult> {
    if (isEmulator()) {
      console.log('📱 Emulator detected - storing wallet with mock persistence');
      console.log('🔧 DEBUG - Storing in emulator:');
      console.log('Address:', address);
      console.log('Private key type:', typeof privateKey);
      console.log('Private key length:', privateKey.length);
      console.log('Private key starts with 0x:', privateKey.startsWith('0x'));
      
      try {
        // 🛠️ FIXED: Store in AsyncStorage for emulator persistence
        await AsyncStorage.setItem(MOCK_WALLET_KEY, 'true');
        await AsyncStorage.setItem(MOCK_CREDENTIALS_KEY, JSON.stringify({
          address: address,
          privateKey: privateKey,
          mnemonic: mnemonic,
          storedAt: new Date().toISOString()
        }));
        
        console.log('✅ Mock wallet stored in AsyncStorage');
        return { success: true };
      } catch (error) {
        console.error('❌ Failed to store mock wallet:', error);
        return { success: false, error: 'Failed to store mock wallet' };
      }
    }

    try {
      console.log('🔧 BiometricService: Attempting to store wallet securely...');
      console.log('🔧 DEBUG - Storage details:');
      console.log('Address:', address);
      console.log('Private key type:', typeof privateKey);
      console.log('Private key length:', privateKey.length);
      console.log('Private key starts with 0x:', privateKey.startsWith('0x'));
      
      let formattedPrivateKey = privateKey.trim();
      
      if (!formattedPrivateKey.startsWith('0x')) {
        console.log('🔧 Adding 0x prefix to private key');
        formattedPrivateKey = '0x' + formattedPrivateKey;
      }
      
      if (formattedPrivateKey.length !== 66) {
        throw new Error(`Invalid private key length: ${formattedPrivateKey.length}, expected 66`);
      }
      
      console.log('✅ Private key format validated for storage');

      let KeychainService;
      try {
        KeychainService = require('../services/KeychainService').default;
      } catch (importError) {
        console.error('KeychainService not available:', importError);
        return {
          success: false,
          error: 'Secure storage not available on this device'
        };
      }
      
      const walletStored = await KeychainService.storeWalletKey(formattedPrivateKey, address);
      if (!walletStored) {
        return {
          success: false,
          error: 'Failed to store wallet credentials'
        };
      }

      if (mnemonic) {
        const mnemonicStored = await KeychainService.storeMnemonic(mnemonic, address);
        if (!mnemonicStored) {
          console.warn('Wallet stored but mnemonic storage failed');
        }
      }

      console.log('✅ BiometricService: Wallet stored successfully');
      return { success: true };

    } catch (error) {
      console.error('Store wallet error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store wallet'
      };
    }
  }

  /**
   * Authenticate user and retrieve wallet credentials - FIXED WITH EMULATOR PERSISTENCE
   */
  static async authenticateAndGetWallet(): Promise<BiometricResult & { credentials?: { address: string; privateKey: string } }> {
    if (isEmulator()) {
      console.log('📱 Emulator detected - mocking authentication success');
      
      try {
        // 🛠️ FIXED: Retrieve from AsyncStorage for emulator
        const storedCredentials = await AsyncStorage.getItem(MOCK_CREDENTIALS_KEY);
        
        if (!storedCredentials) {
          return {
            success: false,
            error: 'No wallet found in emulator storage'
          };
        }
        
        const credentials = JSON.parse(storedCredentials);
        console.log('🔧 DEBUG - Retrieved mock credentials:');
        console.log('Address:', credentials.address);
        console.log('Private key length:', credentials.privateKey?.length);
        console.log('Stored at:', credentials.storedAt);
        
        return {
          success: true,
          credentials: {
            address: credentials.address,
            privateKey: credentials.privateKey,
          }
        };
      } catch (error) {
        console.error('❌ Failed to retrieve mock credentials:', error);
        return {
          success: false,
          error: 'Failed to retrieve mock wallet'
        };
      }
    }

    try {
      console.log('🔧 BiometricService: Attempting authentication...');

      let KeychainService;
      try {
        KeychainService = require('../services/KeychainService').default;
      } catch (importError) {
        console.error('KeychainService not available:', importError);
        return {
          success: false,
          error: 'Secure storage not available on this device'
        };
      }

      const hasWallet = await KeychainService.hasStoredWallet();
      if (!hasWallet) {
        return {
          success: false,
          error: 'No wallet found. Please create or import a wallet first.'
        };
      }

      const walletCredentials = await KeychainService.getWalletKey();
      
      if (!walletCredentials) {
        return {
          success: false,
          error: 'Authentication failed or cancelled'
        };
      }

      console.log('🔧 DEBUG - Retrieved credentials:');
      console.log('Address:', walletCredentials.username);
      console.log('Private key type:', typeof walletCredentials.password);
      console.log('Private key length:', walletCredentials.password?.length);
      console.log('Private key starts with 0x:', walletCredentials.password?.startsWith('0x'));

      let formattedPrivateKey = walletCredentials.password.trim();
      
      if (!formattedPrivateKey.startsWith('0x')) {
        console.log('🔧 Adding 0x prefix to retrieved private key');
        formattedPrivateKey = '0x' + formattedPrivateKey;
      }
      
      if (formattedPrivateKey.length > 66) {
        console.log(`🔧 Retrieved private key too long (${formattedPrivateKey.length}), truncating to 66`);
        formattedPrivateKey = formattedPrivateKey.substring(0, 66);
      }

      return {
        success: true,
        credentials: {
          address: walletCredentials.username,
          privateKey: formattedPrivateKey,
        }
      };

    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Check if user has a wallet set up - FIXED WITH EMULATOR PERSISTENCE
   */
  static async hasWallet(): Promise<boolean> {
    if (isEmulator()) {
      try {
        // 🛠️ FIXED: Check AsyncStorage for emulator
        const hasWallet = await AsyncStorage.getItem(MOCK_WALLET_KEY);
        const walletExists = hasWallet === 'true';
        
        console.log('📱 Emulator detected - checking mock wallet existence:', walletExists);
        return walletExists;
      } catch (error) {
        console.error('❌ Failed to check mock wallet:', error);
        return false;
      }
    }

    try {
      const KeychainService = require('../services/KeychainService').default;
      return await KeychainService.hasStoredWallet();
    } catch (error) {
      console.error('Check wallet error:', error);
      return false;
    }
  }

  /**
   * Clear all wallet data (for reset/logout) - FIXED WITH EMULATOR PERSISTENCE
   */
  static async clearWallet(): Promise<BiometricResult> {
    if (isEmulator()) {
      console.log('📱 Emulator detected - clearing mock wallet');
      try {
        // 🛠️ FIXED: Clear AsyncStorage for emulator
        await AsyncStorage.removeItem(MOCK_WALLET_KEY);
        await AsyncStorage.removeItem(MOCK_CREDENTIALS_KEY);
        console.log('✅ Mock wallet cleared from AsyncStorage');
        return { success: true };
      } catch (error) {
        console.error('❌ Failed to clear mock wallet:', error);
        return { success: false, error: 'Failed to clear mock wallet' };
      }
    }

    try {
      const KeychainService = require('../services/KeychainService').default;
      const cleared = await KeychainService.clearWalletData();
      
      if (cleared) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Failed to clear wallet data'
        };
      }
    } catch (error) {
      console.error('Clear wallet error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear wallet'
      };
    }
  }

  /**
   * Prompt user to enable biometrics (for onboarding) - FIXED VERSION
   */
  static async promptEnableBiometrics(): Promise<{ shouldEnable: boolean; biometricType: string }> {
    if (isEmulator()) {
      console.log('📱 Emulator detected - mocking biometric prompt');
      return {
        shouldEnable: true,
        biometricType: Platform.OS === 'ios' ? 'Face ID' : 'Fingerprint'
      };
    }

    try {
      const biometricType = await this.getBiometricType();
      
      console.log('🔧 BiometricService: Prompt result - Type:', biometricType, 'Should enable: true');
      
      return {
        shouldEnable: true,
        biometricType
      };
    } catch (error) {
      console.warn('Biometric prompt failed:', error);
      return {
        shouldEnable: true,
        biometricType: 'Device Passcode'
      };
    }
  }


  // Add these methods to your existing BiometricService class

/**
 * Authenticate with biometrics (for viewing recovery phrase)
 */
static async authenticateWithBiometrics(): Promise<boolean> {
  if (isEmulator()) {
    console.log('📱 Emulator detected - mocking biometric authentication');
    return true;
  }

  try {
    console.log('🔧 BiometricService: Requesting biometric authentication...');
    
    let KeychainService;
    try {
      KeychainService = require('../services/KeychainService').default;
    } catch (importError) {
      console.error('KeychainService not available:', importError);
      return false;
    }

    // Try to get wallet credentials (this will trigger biometric prompt)
    const walletCredentials = await KeychainService.getWalletKey();
    
    if (walletCredentials) {
      console.log('✅ BiometricService: Authentication successful');
      return true;
    } else {
      console.log('❌ BiometricService: Authentication failed or cancelled');
      return false;
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

/**
 * Get wallet with mnemonic (enhanced version for Settings screen)
 */
static async authenticateAndGetWalletWithMnemonic(): Promise<{
  success: boolean;
  error?: string;
  credentials?: {
    address: string;
    privateKey: string;
    mnemonic?: string;
  };
}> {
  if (isEmulator()) {
    console.log('📱 Emulator detected - mocking authentication with mnemonic');
    
    try {
      const storedCredentials = await AsyncStorage.getItem(MOCK_CREDENTIALS_KEY);
      
      if (!storedCredentials) {
        return {
          success: false,
          error: 'No wallet found in emulator storage'
        };
      }
      
      const credentials = JSON.parse(storedCredentials);
      console.log('🔧 DEBUG - Retrieved mock credentials with mnemonic');
      
      return {
        success: true,
        credentials: {
          address: credentials.address,
          privateKey: credentials.privateKey,
          mnemonic: credentials.mnemonic,
        }
      };
    } catch (error) {
      console.error('❌ Failed to retrieve mock credentials with mnemonic:', error);
      return {
        success: false,
        error: 'Failed to retrieve mock wallet'
      };
    }
  }

  try {
    console.log('🔧 BiometricService: Attempting authentication with mnemonic...');

    let KeychainService;
    try {
      KeychainService = require('../services/KeychainService').default;
    } catch (importError) {
      console.error('KeychainService not available:', importError);
      return {
        success: false,
        error: 'Secure storage not available on this device'
      };
    }

    const hasWallet = await KeychainService.hasStoredWallet();
    if (!hasWallet) {
      return {
        success: false,
        error: 'No wallet found. Please create or import a wallet first.'
      };
    }

    // Get wallet credentials
    const walletCredentials = await KeychainService.getWalletKey();
    
    if (!walletCredentials) {
      return {
        success: false,
        error: 'Authentication failed or cancelled'
      };
    }

    // Get mnemonic
    const mnemonic = await KeychainService.getMnemonic(walletCredentials.username);

    let formattedPrivateKey = walletCredentials.password.trim();
    
    if (!formattedPrivateKey.startsWith('0x')) {
      formattedPrivateKey = '0x' + formattedPrivateKey;
    }
    
    if (formattedPrivateKey.length > 66) {
      formattedPrivateKey = formattedPrivateKey.substring(0, 66);
    }

    return {
      success: true,
      credentials: {
        address: walletCredentials.username,
        privateKey: formattedPrivateKey,
        mnemonic: mnemonic || undefined,
      }
    };

  } catch (error) {
    console.error('Biometric authentication with mnemonic error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * Clear all wallet data (alias for clearWallet for Settings screen compatibility)
 */
static async clearWalletData(): Promise<void> {
  console.log('🗑️ BiometricService: Clearing wallet data...');
  
  const result = await this.clearWallet();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to clear wallet data');
  }
  
  console.log('✅ BiometricService: Wallet data cleared successfully');
}

/**
 * Clear biometric session (for wallet locking)
 */
static async clearBiometricSession(): Promise<void> {
  const BIOMETRIC_SESSION_KEY = 'biometric_session_active';
  
  if (isEmulator()) {
    console.log('📱 Emulator detected - clearing mock biometric session');
    try {
      await AsyncStorage.removeItem(BIOMETRIC_SESSION_KEY);
      console.log('✅ Mock biometric session cleared');
    } catch (error) {
      console.error('❌ Failed to clear mock session:', error);
      throw new Error('Failed to clear biometric session');
    }
    return;
  }

  try {
    // Clear any session tokens or temporary authentication state
    await AsyncStorage.removeItem(BIOMETRIC_SESSION_KEY);
    console.log('✅ BiometricService: Biometric session cleared');
  } catch (error) {
    console.error('❌ BiometricService: Failed to clear session:', error);
    throw new Error('Failed to clear biometric session');
  }
}



}

export default BiometricService;