import { ethers } from 'ethers';

export const isValidMnemonic = (mnemonic: string): boolean => {
  try {
    ethers.Mnemonic.fromPhrase(mnemonic);
    return true;
  } catch {
    return false;
  }
};

export const isValidPrivateKey = (privateKey: string): boolean => {
  try {
    new ethers.Wallet(privateKey);
    return true;
  } catch {
    return false;
  }
};

export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

export const isValidAmount = (amount: string, balance?: string): { isValid: boolean; error?: string } => {
  try {
    const amountBN = ethers.parseEther(amount);
    
    if (amountBN <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }

    if (balance) {
      const balanceBN = ethers.parseEther(balance);
      if (amountBN > balanceBN) {
        return { isValid: false, error: 'Insufficient balance' };
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid amount format' };
  }
};

export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Password must contain uppercase, lowercase, and numbers' };
  }

  return { isValid: true };
};