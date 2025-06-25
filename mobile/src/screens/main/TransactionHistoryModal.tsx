// Updated TransactionHistoryModal.tsx - Replace your existing file

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Share,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEmbeddedWallet } from '../../contexts/EmbeddedWalletContext';
import { Transaction } from '../../services/TransactionService';
import { getCurrentNetwork } from '../../constants/networks';

interface TransactionHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({ 
  visible, 
  onClose 
}) => {
  const { address, getTransactionHistory, getTransactionStats } = useEmbeddedWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const currentNetwork = getCurrentNetwork();

  useEffect(() => {
    if (visible && address) {
      fetchData();
    }
  }, [visible, address]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching transaction history...');
      
      // Fetch real transaction data
      const [transactionHistory, transactionStats] = await Promise.all([
        getTransactionHistory(),
        getTransactionStats()
      ]);
      
      setTransactions(transactionHistory);
      setStats(transactionStats);
      
      console.log(`✅ Loaded ${transactionHistory.length} transactions`);
    } catch (error) {
      console.error('Failed to fetch transaction data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatAmount = (amount: string, type: string): string => {
    const symbol = type === 'yield' ? '+₿' : type === 'withdraw' ? '-₿' : '₿';
    return `${symbol} ${parseFloat(amount).toFixed(6)}`;
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return 'time-outline';
    if (status === 'failed') return 'close-circle-outline';
    
    switch (type) {
      case 'deposit': return 'arrow-down-circle-outline';
      case 'withdraw': return 'arrow-up-circle-outline';
      case 'yield': return 'trending-up-outline';
      default: return 'swap-horizontal-outline';
    }
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'pending') return '#FFB74D';
    if (status === 'failed') return '#ef5350';
    
    switch (type) {
      case 'deposit': return '#4CAF50';
      case 'withdraw': return '#FF7043';
      case 'yield': return '#667eea';
      default: return '#9E9E9E';
    }
  };

  const formatUSDValue = (usdValue: string): string => {
    const value = parseFloat(usdValue);
    return value.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.timestamp);
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86400000);
      
      let groupKey;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString();
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(tx);
    });
    
    return groups;
  };

  const handleTransactionPress = (transaction: Transaction) => {
    if (!transaction.txHash) return;
    
    const explorerUrl = `${currentNetwork.explorerUrl}/tx/${transaction.txHash}`;
    Linking.openURL(explorerUrl);
  };

  const handleShareTransaction = async (transaction: Transaction) => {
    try {
      const message = `Rootsave Transaction
Type: ${transaction.type}
Amount: ${formatAmount(transaction.amount, transaction.type)}
Date: ${new Date(transaction.timestamp).toLocaleString()}
${transaction.txHash ? `TX: ${transaction.txHash}` : ''}`;

      await Share.share({
        message,
        title: 'Rootsave Transaction Details'
      });
    } catch (error) {
      console.error('Error sharing transaction:', error);
    }
  };

  if (!visible) return null;

  const groupedTransactions = groupTransactionsByDate(transactions);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transaction History</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Statistics Summary */}
        {stats && (
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.statsCard}
            >
              <Text style={styles.statsTitle}>Summary</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>₿ {stats.totalDeposits.toFixed(6)}</Text>
                  <Text style={styles.statLabel}>Total Deposits</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>₿ {stats.totalYieldEarned.toFixed(6)}</Text>
                  <Text style={styles.statLabel}>Yield Earned</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.transactionCount}</Text>
                  <Text style={styles.statLabel}>Transactions</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              colors={['#fff']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyStateText}>
                Your transaction history will appear here after your first deposit
              </Text>
            </View>
          ) : (
            Object.entries(groupedTransactions).map(([dateGroup, txs]) => (
              <View key={dateGroup} style={styles.dateGroup}>
                <Text style={styles.dateGroupTitle}>{dateGroup}</Text>
                
                {txs.map((transaction) => (
                  <TouchableOpacity 
                    key={transaction.id} 
                    style={styles.transactionCard}
                    onPress={() => handleTransactionPress(transaction)}
                    onLongPress={() => handleShareTransaction(transaction)}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                      style={styles.cardGradient}
                    >
                      <View style={styles.transactionRow}>
                        <View style={styles.leftSection}>
                          <View style={[
                            styles.iconContainer,
                            { backgroundColor: getTransactionColor(transaction.type, transaction.status) + '20' }
                          ]}>
                            <Ionicons 
                              name={getTransactionIcon(transaction.type, transaction.status)} 
                              size={24} 
                              color={getTransactionColor(transaction.type, transaction.status)} 
                            />
                          </View>
                          
                          <View style={styles.transactionInfo}>
                            <Text style={styles.transactionType}>
                              {transaction.type === 'deposit' ? 'Deposit' :
                               transaction.type === 'withdraw' ? 'Withdrawal' : 'Yield Earned'}
                            </Text>
                            <Text style={styles.transactionTime}>
                              {formatDate(transaction.timestamp)}
                            </Text>
                            {transaction.txHash && (
                              <Text style={styles.txHash}>
                                {transaction.txHash.slice(0, 10)}...{transaction.txHash.slice(-6)}
                              </Text>
                            )}
                            {transaction.notes && (
                              <Text style={styles.transactionNotes}>
                                {transaction.notes}
                              </Text>
                            )}
                          </View>
                        </View>
                        
                        <View style={styles.rightSection}>
                          <Text style={[
                            styles.transactionAmount,
                            { color: getTransactionColor(transaction.type, transaction.status) }
                          ]}>
                            {formatAmount(transaction.amount, transaction.type)}
                          </Text>
                          <Text style={styles.transactionUSD}>
                            {formatUSDValue(transaction.usdValue)}
                          </Text>
                          <View style={[
                            styles.statusBadge,
                            { backgroundColor: getTransactionColor(transaction.type, transaction.status) + '20' }
                          ]}>
                            <Text style={[
                              styles.statusText,
                              { color: getTransactionColor(transaction.type, transaction.status) }
                            ]}>
                              {transaction.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginHorizontal: 24,
  },
  transactionCard: {
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  txHash: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  transactionNotes: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionUSD: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default TransactionHistoryModal;