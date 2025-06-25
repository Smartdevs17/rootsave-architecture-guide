import { NetworkType } from '../types';

export interface ContractConfig {
  address: string;
  abi: any[]; // Will be populated later
}

// Contract addresses for different networks
export const CONTRACT_ADDRESSES: Record<NetworkType, string> = {
  testnet: process.env.EXPO_PUBLIC_ROOTSAVE_CONTRACT_TESTNET || '',
  mainnet: process.env.EXPO_PUBLIC_ROOTSAVE_CONTRACT_MAINNET || '',
};

export const getContractAddress = (network?: NetworkType): string => {
  const networkType = network || (process.env.EXPO_PUBLIC_NETWORK as NetworkType) || 'testnet';
  return CONTRACT_ADDRESSES[networkType];
};

// Contract ABI (simplified for now - will be complete later)
export const ROOTSAVE_ABI = [
  'function deposit() external payable',
  'function withdraw() external',
  'function getUserDeposit(address user) external view returns (uint256)',
  'function getCurrentYield(address user) external view returns (uint256)',
  'function getTotalWithdrawable(address user) external view returns (uint256)',
  'function getContractBalance() external view returns (uint256)',
  'event Deposit(address indexed user, uint256 amount, uint256 timestamp)',
  'event Withdraw(address indexed user, uint256 principal, uint256 yield, uint256 total)',
];