import { ethers } from 'ethers';

/**
 * Wallet utility functions for Rootstock blockchain
 * Handles key generation, validation, and formatting
 */

export interface WalletCredentials {
  address: string;
  privateKey: string;
  mnemonic: string;
}

/**
 * Generate a new random wallet with mnemonic
 */
export function generateRandomWallet(): WalletCredentials {
  try {
    // Generate random mnemonic (12 words)
    const wallet = ethers.Wallet.createRandom();
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || '',
    };
  } catch (error) {
    console.error('Failed to generate random wallet:', error);
    throw new Error('Failed to generate wallet');
  }
}

/**
 * Restore wallet from mnemonic phrase
 */
export function generateWalletFromMnemonic(mnemonic: string): Omit<WalletCredentials, 'mnemonic'> {
  try {
    // Validate and create wallet from mnemonic
    const wallet = ethers.Wallet.fromMnemonic(mnemonic.trim());
    
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  } catch (error) {
    console.error('Failed to generate wallet from mnemonic:', error);
    throw new Error('Invalid mnemonic phrase');
  }
}

/**
 * Validate mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    const trimmedMnemonic = mnemonic.trim();
    
    // Check word count (12 or 24 words)
    const words = trimmedMnemonic.split(' ').filter(word => word.length > 0);
    if (words.length !== 12 && words.length !== 24) {
      return false;
    }
    
    // Try to create wallet (will throw if invalid)
    ethers.Wallet.fromMnemonic(trimmedMnemonic);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate Ethereum/Rootstock address
 */
export function validateAddress(address: string): boolean {
  try {
    return ethers.utils.isAddress(address);
  } catch (error) {
    return false;
  }
}

/**
 * Format balance from wei to RBTC with specified decimals
 */
export function formatBalance(weiBalance: string, decimals: number = 4): string {
  try {
    const balance = ethers.utils.formatEther(weiBalance);
    const rounded = parseFloat(balance).toFixed(decimals);
    
    // Remove trailing zeros
    return parseFloat(rounded).toString();
  } catch (error) {
    console.error('Failed to format balance:', error);
    return '0';
  }
}

/**
 * Parse RBTC amount to wei
 */
export function parseRBTC(amount: string): string {
  try {
    return ethers.utils.parseEther(amount).toString();
  } catch (error) {
    console.error('Failed to parse RBTC amount:', error);
    throw new Error('Invalid amount format');
  }
}

/**
 * Format RBTC amount with currency symbol
 */
export function formatRBTC(weiBalance: string, decimals: number = 4): string {
  const balance = formatBalance(weiBalance, decimals);
  return `${balance} RBTC`;
}

/**
 * Generate a deterministic wallet address preview from mnemonic (for verification)
 */
export function getAddressFromMnemonic(mnemonic: string): string {
  try {
    const wallet = ethers.Wallet.fromMnemonic(mnemonic.trim());
    return wallet.address;
  } catch (error) {
    throw new Error('Cannot derive address from mnemonic');
  }
}

/**
 * Truncate address for display (0x1234...5678)
 */
export function truncateAddress(address: string, startLength: number = 6, endLength: number = 4): string {
  if (!validateAddress(address)) {
    return 'Invalid Address';
  }
  
  if (address.length <= startLength + endLength) {
    return address;
  }
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Calculate simple interest for yield (5% APY)
 */
export function calculateYieldAmount(principal: string, timeInSeconds: number, aprPercent: number = 5): string {
  try {
    const principalWei = ethers.BigNumber.from(principal);
    const secondsInYear = 365 * 24 * 60 * 60;
    
    // Simple interest: yield = principal * (apr/100) * (time/year)
    const yieldAmount = principalWei
      .mul(aprPercent)
      .mul(timeInSeconds)
      .div(100)
      .div(secondsInYear);
    
    return yieldAmount.toString();
  } catch (error) {
    console.error('Failed to calculate yield:', error);
    return '0';
  }
}

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Validate private key format
 */
export function validatePrivateKey(privateKey: string): boolean {
  try {
    // Check if it's a valid hex string of correct length
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    if (privateKey.length !== 66) { // 0x + 64 hex chars
      return false;
    }
    
    // Try to create wallet from private key
    new ethers.Wallet(privateKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safe number formatting for display
 */
export function formatNumber(value: string | number, decimals: number = 2): string {
  try {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) return '0';
    
    // Handle very small numbers
    if (num < 0.01 && num > 0) {
      return '< 0.01';
    }
    
    // Handle large numbers with K, M notation
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    
    return num.toFixed(decimals);
  } catch (error) {
    return '0';
  }
}