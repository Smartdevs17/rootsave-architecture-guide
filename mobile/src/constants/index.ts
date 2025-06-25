export * from './networks';
export * from './contracts';

export const APP_CONFIG = {
  name: 'Rootsave',
  version: '1.0.0',
  description: 'Bitcoin Savings on Rootstock',
  supportEmail: 'support@rootsave.io',
};

export const STORAGE_KEYS = {
  WALLET_DATA: '@rootsave:wallet',
  USER_PREFERENCES: '@rootsave:preferences',
  BIOMETRIC_ENABLED: '@rootsave:biometric',
  LAST_BALANCE_UPDATE: '@rootsave:lastUpdate',
};

export const YIELD_CONFIG = {
  ANNUAL_RATE: 5, // 5% APY
  UPDATE_INTERVAL: 1000, // 1 second
  MINIMUM_DEPOSIT: '0.001', // 0.001 RBTC
};