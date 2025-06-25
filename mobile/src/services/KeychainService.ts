import * as Keychain from 'react-native-keychain';
import { KeychainItem } from '../types/wallet';

/**
 * Secure storage service for wallet credentials using device keychain
 * Follows RSKVault security patterns with biometric protection
 */
class KeychainService {
  private static readonly WALLET_KEY = 'rootsave_wallet';
  private static readonly MNEMONIC_KEY = 'rootsave_mnemonic';

  /**
   * Store encrypted wallet private key in keychain
   */
  static async storeWalletKey(privateKey: string, address: string): Promise<boolean> {
    try {
      await Keychain.setInternetCredentials(
        this.WALLET_KEY,
        address,
        privateKey,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessGroup: undefined, // iOS only
        }
      );
      return true;
    } catch (error) {
      console.error('Failed to store wallet key:', error);
      return false;
    }
  }

  /**
   * Retrieve wallet private key with biometric authentication
   */
  static async getWalletKey(): Promise<KeychainItem | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.WALLET_KEY, {
        authenticationPrompt: {
          title: 'Unlock Rootsave',
          subtitle: 'Use biometrics to access your wallet',
          description: 'Authenticate to continue',
          cancel: 'Cancel', // Only supported extra field
        },
      });

      if (credentials && credentials.username && credentials.password) {
        return {
          username: credentials.username, // address
          password: credentials.password, // privateKey
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve wallet key:', error);
      return null;
    }
  }

  /**
   * Store encrypted mnemonic phrase (for backup/recovery)
   */
  static async storeMnemonic(mnemonic: string, address: string): Promise<boolean> {
    try {
      await Keychain.setInternetCredentials(
        this.MNEMONIC_KEY,
        address,
        mnemonic,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to store mnemonic:', error);
      return false;
    }
  }

  /**
   * Check if wallet credentials exist in keychain
   */
  static async hasStoredWallet(): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.WALLET_KEY);
      return !!(credentials && credentials.username && credentials.password);
    } catch (error) {
      // If error, assume no credentials stored
      return false;
    }
  }

  /**
   * Clear all stored wallet data (for logout/reset)
   */
  static async clearWalletData(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials({ service: this.WALLET_KEY });
      await Keychain.resetInternetCredentials({ service: this.MNEMONIC_KEY });
      return true;
    } catch (error) {
      console.error('Failed to clear wallet data:', error);
      return false;
    }
  }

  /**
   * Check if biometric authentication is available on device
   */
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      console.error('Biometric check failed:', error);
      return false;
    }
  }

  /**
   * Get available biometry type for UI display
   */
  static async getBiometryType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    try {
      return await Keychain.getSupportedBiometryType();
    } catch (error) {
      console.error('Failed to get biometry type:', error);
      return null;
    }
  }
}

export default KeychainService;