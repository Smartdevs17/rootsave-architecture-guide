import { ethers } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'react-native-crypto-js';
import { Wallet, CreateWalletResponse, ImportWalletParams } from '../types';
import { STORAGE_KEYS } from '../constants';

export class WalletService {
  private static instance: WalletService;
  
  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  // Generate new wallet with mnemonic
  async createWallet(password: string): Promise<CreateWalletResponse> {
    try {
      // Generate random mnemonic
      const wallet = ethers.Wallet.createRandom();
      
      const walletData: Wallet = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || '',
        isEncrypted: true,
      };

      // Encrypt and store wallet
      await this.encryptAndStoreWallet(walletData, password);

      return {
        wallet: {
          ...walletData,
          privateKey: '', // Don't return private key in response
        },
        success: true,
      };
    } catch (error) {
      return {
        wallet: {} as Wallet,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create wallet',
      };
    }
  }

  // Import wallet from mnemonic
  async importWallet({ mnemonic, password }: ImportWalletParams): Promise<CreateWalletResponse> {
    try {
      // Create wallet from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      
      const walletData: Wallet = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: mnemonic,
        isEncrypted: true,
      };

      // Encrypt and store wallet
      await this.encryptAndStoreWallet(walletData, password);

      return {
        wallet: {
          ...walletData,
          privateKey: '', // Don't return private key in response
        },
        success: true,
      };
    } catch (error) {
      return {
        wallet: {} as Wallet,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import wallet',
      };
    }
  }

  // Decrypt and load wallet
  async loadWallet(password: string): Promise<Wallet | null> {
    try {
      const encryptedData = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!encryptedData) return null;

      const decryptedData = CryptoJS.AES.decrypt(encryptedData, password).toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedData) as Wallet;
    } catch (error) {
      console.error('Failed to load wallet:', error);
      return null;
    }
  }

  // Check if wallet exists
  async hasWallet(): Promise<boolean> {
    try {
      const walletData = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      return walletData !== null;
    } catch {
      return false;
    }
  }

  // Delete wallet (for logout/reset)
  async deleteWallet(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_DATA);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED);
    } catch (error) {
      console.error('Failed to delete wallet:', error);
    }
  }

  // Private method to encrypt and store wallet
  private async encryptAndStoreWallet(wallet: Wallet, password: string): Promise<void> {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(wallet), password).toString();
    await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_DATA, encrypted);
  }

  // Get wallet address without full decryption
  async getWalletAddress(): Promise<string | null> {
    try {
      const encryptedData = await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_DATA);
      if (!encryptedData) return null;

      // For demo purposes - in production, you might store address separately
      // or use a different approach to avoid requiring password for address
      return null; // Will be handled by the hook when wallet is loaded
    } catch {
      return null;
    }
  }
}