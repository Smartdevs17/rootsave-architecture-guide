import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEmbeddedWallet } from '../../contexts/EmbeddedWalletContext';
import { ActivityIndicator } from 'react-native';

const { width } = Dimensions.get('window');

interface VaultDashboardProps {
  onDeposit: () => void;
  onWithdraw: () => void;
  onSettings: () => void;
  onHistory: () => void; // 👈 ADD THIS
  onLockWallet: () => void;
  refreshTrigger?: number;
}

export default function VaultDashboard({ 
  onDeposit, 
  onWithdraw, 
  onSettings, 
  onHistory, // 👈 ADD THIS
  onLockWallet,
  refreshTrigger = 0
}: VaultDashboardProps) {
  const { 
    balance, 
    address, 
    getCurrentYield, 
    getUserDeposit, 
    getTotalWithdrawable 
  } = useEmbeddedWallet();

  const [refreshing, setRefreshing] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0');
  const [yieldAmount, setYieldAmount] = useState('0');
  const [totalWithdrawable, setTotalWithdrawable] = useState('0');
  const [realtimeYield, setRealtimeYield] = useState(0);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false); // Add auto-refresh indicator
  
  // Animation values
  const [balanceAnim] = useState(new Animated.Value(0));
  const [yieldAnim] = useState(new Animated.Value(0));

  /**
   * Fetch all balances and contract data - REAL CONTRACT INTEGRATION
   * Note: Contract allows only one deposit per user (must withdraw to deposit again)
   */
  const fetchBalances = useCallback(async () => {
    try {
      console.log('💰 VaultDashboard: Fetching real contract balances...');
      
      // Get real data from your Rootsave contract
      const [userDeposit, currentYield, totalWithdrawable] = await Promise.all([
        getUserDeposit(),      // Your contract: getUserDeposit(address)
        getCurrentYield(),     // Your contract: getCurrentYield(address)  
        getTotalWithdrawable() // Your contract: getTotalWithdrawable(address)
      ]);
      
      console.log('📊 Contract Data:', {
        deposit: userDeposit,
        yield: currentYield,
        total: totalWithdrawable
      });
      
      // Convert wei to RBTC for display
      const depositRBTC = (parseFloat(userDeposit) / Math.pow(10, 18)).toString();
      const yieldRBTC = (parseFloat(currentYield) / Math.pow(10, 18)).toString();
      const totalRBTC = (parseFloat(totalWithdrawable) / Math.pow(10, 18)).toString();
      
      setDepositAmount(depositRBTC);
      setYieldAmount(yieldRBTC);
      setTotalWithdrawable(totalRBTC);
      
      console.log('✅ VaultDashboard: Data updated successfully');
      
      // Animate balance updates
      Animated.parallel([
        Animated.timing(balanceAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(yieldAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]).start();
      
    } catch (error) {
      console.error('❌ VaultDashboard: Failed to fetch contract balances:', error);
      // Fallback to show zeros if contract calls fail
      setDepositAmount('0');
      setYieldAmount('0');
      setTotalWithdrawable('0');
    }
  }, [getUserDeposit, getCurrentYield, getTotalWithdrawable]);

  /**
   * Real-time yield calculation - UPDATES FROM CONTRACT
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Get updated yield from contract every 10 seconds
        const currentYield = await getCurrentYield();
        const yieldRBTC = parseFloat(currentYield) / Math.pow(10, 18);
        setRealtimeYield(yieldRBTC);
      } catch (error) {
        console.error('Failed to update real-time yield:', error);
      }
    }, 10000); // Update every 10 seconds (less frequent to avoid spam)

    return () => clearInterval(interval);
  }, [getCurrentYield]);

  /**
   * Initial data load and refresh trigger
   */
  useEffect(() => {
    // Only show auto-refresh indicator if it's a triggered refresh (not initial load)
    if (refreshTrigger > 0) {
      setIsAutoRefreshing(true);
      console.log('🔄 Auto-refreshing dashboard after transaction...');
    }
    
    fetchBalances().finally(() => {
      setIsAutoRefreshing(false);
    });
  }, [fetchBalances, refreshTrigger]);

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBalances();
    setRefreshing(false);
  }, [fetchBalances]);

  /**
   * Format balance for display
   */
  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    return num.toFixed(6);
  };

  /**
   * Calculate USD equivalent (mock rate)
   */
  const getUSDValue = (rbtcAmount: string): string => {
    const btcPrice = 43000; // Mock BTC price
    const usd = parseFloat(rbtcAmount) * btcPrice;
    return usd.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  /**
   * Get greeting based on time
   */
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.backgroundGradient}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#FFFFFF']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()} 👋</Text>
            <View style={styles.addressRow}>
              <Text style={styles.addressText}>
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Loading...'}
              </Text>
              {isAutoRefreshing && (
                <ActivityIndicator 
                  size="small" 
                  color="rgba(255,255,255,0.7)" 
                  style={styles.refreshIndicator}
                />
              )}
            </View>
          </View>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerButton} onPress={onHistory}>
              <Text style={styles.headerButtonText}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={onSettings}>
              <Text style={styles.headerButtonText}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={onLockWallet}>
              <Text style={styles.headerButtonText}>🔒</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Balance Card */}
        <Animated.View style={[styles.balanceCard, {
          opacity: balanceAnim,
          transform: [{
            translateY: balanceAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.cardGradient}
          >
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>
              ₿ {formatBalance(totalWithdrawable)}
            </Text>
            <Text style={styles.balanceUSD}>
              {getUSDValue(totalWithdrawable)}
            </Text>
            
            {/* Balance Breakdown */}
            {parseFloat(depositAmount) > 0 ? (
              <View style={styles.balanceBreakdown}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Principal</Text>
                  <Text style={styles.breakdownValue}>₿ {formatBalance(depositAmount)}</Text>
                </View>
                <View style={styles.breakdownDivider} />
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownLabel}>Yield Earned</Text>
                  <Text style={styles.breakdownValue}>₿ {formatBalance(yieldAmount)}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.noDepositContainer}>
                <Text style={styles.noDepositText}>💰 Make your first deposit to start earning 5% APY</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Yield Counter Card */}
        <Animated.View style={[styles.yieldCard, {
          opacity: yieldAnim,
          transform: [{
            translateY: yieldAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        }]}>
          <LinearGradient
            colors={['rgba(255,159,67,0.2)', 'rgba(255,107,107,0.1)']}
            style={styles.cardGradient}
          >
            <View style={styles.yieldHeader}>
              <Text style={styles.yieldTitle}>Live Yield Counter</Text>
              <Text style={styles.yieldRate}>5% APY 🚀</Text>
            </View>
            
            {parseFloat(depositAmount) > 0 ? (
              <>
                <Text style={styles.realtimeYield}>
                  +₿ {parseFloat(yieldAmount).toFixed(8)}
                </Text>
                <Text style={styles.yieldSubtext}>Earning every second</Text>
                
                {/* Yield Projections */}
                <View style={styles.projections}>
                  <View style={styles.projectionItem}>
                    <Text style={styles.projectionLabel}>Daily</Text>
                    <Text style={styles.projectionValue}>
                      +₿ {(parseFloat(depositAmount) * 0.05 / 365).toFixed(6)}
                    </Text>
                  </View>
                  <View style={styles.projectionItem}>
                    <Text style={styles.projectionLabel}>Monthly</Text>
                    <Text style={styles.projectionValue}>
                      +₿ {(parseFloat(depositAmount) * 0.05 / 12).toFixed(6)}
                    </Text>
                  </View>
                  <View style={styles.projectionItem}>
                    <Text style={styles.projectionLabel}>Yearly</Text>
                    <Text style={styles.projectionValue}>
                      +₿ {(parseFloat(depositAmount) * 0.05).toFixed(6)}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.noYieldContainer}>
                <Text style={styles.noYieldText}>⏰ Start earning yield by making a deposit</Text>
                <Text style={styles.noYieldSubtext}>Your RBTC will immediately begin earning 5% APY</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.depositButton} onPress={onDeposit}>
            <LinearGradient
              colors={['#56ab2f', '#a8e6cf']}
              style={styles.buttonGradient}
            >
              <Text style={styles.depositButtonText}>
                {parseFloat(depositAmount) > 0 ? '💰 Add More RBTC' : '💰 Deposit RBTC'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.withdrawButton,
              parseFloat(depositAmount) === 0 && styles.disabledButton
            ]} 
            onPress={parseFloat(depositAmount) > 0 ? onWithdraw : undefined}
            disabled={parseFloat(depositAmount) === 0}
          >
            <LinearGradient
              colors={parseFloat(depositAmount) > 0 ? ['#ff7e5f', '#feb47b'] : ['#6B7280', '#9CA3AF']}
              style={styles.buttonGradient}
            >
              <Text style={[
                styles.withdrawButtonText,
                parseFloat(depositAmount) === 0 && styles.disabledButtonText
              ]}>
                💸 Withdraw All
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Footer spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'monospace',
  },
  refreshIndicator: {
    marginLeft: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 18,
  },
  balanceCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  balanceLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceUSD: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  breakdownLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noDepositContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noDepositText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noYieldContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noYieldText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  noYieldSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  yieldCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  yieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yieldTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  yieldRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  realtimeYield: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  yieldSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
  },
  projections: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  projectionItem: {
    alignItems: 'center',
  },
  projectionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  projectionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 16,
  },
  depositButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  withdrawButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  depositButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  withdrawButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledButtonText: {
    color: 'rgba(255,255,255,0.7)',
  },

});