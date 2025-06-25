export * from './wallet';
export * from './contract';
export * from './env.d';

// Common types
export type NetworkType = 'testnet' | 'mainnet';

export interface BaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}