// 1. Create TransactionService.ts - handles all transaction recording

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'yield';
  amount: string; // In RBTC
  usdValue: string; // USD value at time of transaction
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  notes?: string;
}

const TRANSACTIONS_STORAGE_KEY = 'rootsave_transactions';
const LAST_YIELD_UPDATE_KEY = 'rootsave_last_yield_update';

export class TransactionService {
  
  /**
   * Get current BTC price (mock for demo - replace with real API)
   */
  private static async getBTCPrice(): Promise<number> {
    try {
      // TODO: Replace with real price API like CoinGecko
      // const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      // const data = await response.json();
      // return data.bitcoin.usd;
      
      // For demo, return mock price
      return 43000;
    } catch (error) {
      console.error('Failed to fetch BTC price:', error);
      return 43000; // Fallback price
    }
  }

  /**
   * Calculate USD value for RBTC amount
   */
  private static async calculateUSDValue(rbtcAmount: string): Promise<string> {
    const btcPrice = await this.getBTCPrice();
    const usdValue = parseFloat(rbtcAmount) * btcPrice;
    return usdValue.toFixed(2);
  }

  /**
   * Generate unique transaction ID
   */
  private static generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all transactions for the current wallet
   */
  static async getTransactions(walletAddress: string): Promise<Transaction[]> {
    try {
      const stored = await AsyncStorage.getItem(`${TRANSACTIONS_STORAGE_KEY}_${walletAddress}`);
      if (!stored) return [];
      
      const transactions: Transaction[] = JSON.parse(stored);
      return transactions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      return [];
    }
  }

  /**
   * Save transactions to storage
   */
  private static async saveTransactions(walletAddress: string, transactions: Transaction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${TRANSACTIONS_STORAGE_KEY}_${walletAddress}`, 
        JSON.stringify(transactions)
      );
    } catch (error) {
      console.error('Failed to save transactions:', error);
    }
  }

  /**
   * Record a new transaction
   */
  static async recordTransaction(
    walletAddress: string,
    type: 'deposit' | 'withdraw' | 'yield',
    amount: string,
    txHash?: string,
    notes?: string
  ): Promise<Transaction> {
    try {
      const usdValue = await this.calculateUSDValue(amount);
      
      const transaction: Transaction = {
        id: this.generateTransactionId(),
        type,
        amount,
        usdValue,
        timestamp: Date.now(),
        status: 'completed',
        txHash,
        notes,
      };

      // Get existing transactions
      const existingTransactions = await this.getTransactions(walletAddress);
      
      // Add new transaction
      const updatedTransactions = [transaction, ...existingTransactions];
      
      // Save back to storage
      await this.saveTransactions(walletAddress, updatedTransactions);
      
      console.log(`✅ Transaction recorded: ${type} ${amount} RBTC`);
      return transaction;
      
    } catch (error) {
      console.error('Failed to record transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction status (useful for pending transactions)
   */
  static async updateTransactionStatus(
    walletAddress: string,
    transactionId: string,
    status: 'completed' | 'pending' | 'failed',
    txHash?: string
  ): Promise<void> {
    try {
      const transactions = await this.getTransactions(walletAddress);
      const updatedTransactions = transactions.map(tx => 
        tx.id === transactionId 
          ? { ...tx, status, ...(txHash && { txHash }) }
          : tx
      );
      
      await this.saveTransactions(walletAddress, updatedTransactions);
    } catch (error) {
      console.error('Failed to update transaction status:', error);
    }
  }

  /**
   * Record yield earnings (called periodically)
   */
  static async recordYieldEarning(
    walletAddress: string,
    yieldAmount: string
  ): Promise<Transaction | null> {
    try {
      // Only record if yield amount is significant (> 0.000001 RBTC)
      if (parseFloat(yieldAmount) < 0.000001) {
        return null;
      }

      // Check when we last recorded yield to avoid spam
      const lastYieldKey = `${LAST_YIELD_UPDATE_KEY}_${walletAddress}`;
      const lastYieldTime = await AsyncStorage.getItem(lastYieldKey);
      const now = Date.now();
      
      // Only record yield once per hour
      if (lastYieldTime && (now - parseInt(lastYieldTime)) < 3600000) {
        return null;
      }

      // Record the yield transaction
      const transaction = await this.recordTransaction(
        walletAddress,
        'yield',
        yieldAmount,
        undefined,
        'Automatic yield earning (5% APY)'
      );

      // Update last yield time
      await AsyncStorage.setItem(lastYieldKey, now.toString());
      
      return transaction;
    } catch (error) {
      console.error('Failed to record yield earning:', error);
      return null;
    }
  }

  /**
   * Clear all transactions (for wallet reset)
   */
  static async clearTransactions(walletAddress: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${TRANSACTIONS_STORAGE_KEY}_${walletAddress}`);
      await AsyncStorage.removeItem(`${LAST_YIELD_UPDATE_KEY}_${walletAddress}`);
      console.log('✅ Transaction history cleared');
    } catch (error) {
      console.error('Failed to clear transactions:', error);
    }
  }

  /**
   * Get transaction statistics
   */
  static async getTransactionStats(walletAddress: string): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    totalYieldEarned: number;
    transactionCount: number;
  }> {
    try {
      const transactions = await this.getTransactions(walletAddress);
      
      const stats = transactions.reduce((acc, tx) => {
        const amount = parseFloat(tx.amount);
        
        switch (tx.type) {
          case 'deposit':
            acc.totalDeposits += amount;
            break;
          case 'withdraw':
            acc.totalWithdrawals += amount;
            break;
          case 'yield':
            acc.totalYieldEarned += amount;
            break;
        }
        
        return acc;
      }, {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalYieldEarned: 0,
        transactionCount: transactions.length
      });

      return stats;
    } catch (error) {
      console.error('Failed to get transaction stats:', error);
      return {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalYieldEarned: 0,
        transactionCount: 0
      };
    }
  }

  /**
   * Export transactions (for backup or analysis)
   */
  static async exportTransactions(walletAddress: string): Promise<string> {
    try {
      const transactions = await this.getTransactions(walletAddress);
      const stats = await this.getTransactionStats(walletAddress);
      
      const exportData = {
        walletAddress,
        exportDate: new Date().toISOString(),
        stats,
        transactions
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export transactions:', error);
      throw error;
    }
  }
}