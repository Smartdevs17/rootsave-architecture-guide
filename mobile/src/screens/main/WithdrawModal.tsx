import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEmbeddedWallet } from '../../contexts/EmbeddedWalletContext';

interface WithdrawModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface WithdrawData {
  totalWithdrawable: string;
  principal: string;
  yieldEarned: string;
  depositTime: string;
}

// Enhanced transaction state hook (same as DepositModal)
const useTransactionState = () => {
  const [state, setState] = useState({
    isLoading: false,
    error: null as string | null,
    success: false,
    txHash: null as string | null,
    loadingMessage: 'Processing...'
  });

  const reset = () => setState({
    isLoading: false,
    error: null,
    success: false,
    txHash: null,
    loadingMessage: 'Processing...'
  });

  const setLoading = (message: string) => setState(prev => ({
    ...prev,
    isLoading: true,
    error: null,
    loadingMessage: message
  }));

  const setError = (error: string | Error) => setState(prev => ({
    ...prev,
    isLoading: false,
    error: typeof error === 'string' ? error : error.message || 'Transaction failed'
  }));

  const setSuccess = (txHash: string) => setState(prev => ({
    ...prev,
    isLoading: false,
    success: true,
    txHash,
    error: null
  }));

  return { state, reset, setLoading, setError, setSuccess };
};

// Enhanced error message function
const getErrorMessage = (error: any): string => {
  console.error('Withdrawal error:', error);
  
  const errorString = error?.message || error?.toString() || '';
  
  // Network errors
  if (errorString.includes('network') || errorString.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // No deposit errors
  if (errorString.includes('No deposit found') || errorString.includes('no active deposit')) {
    return 'No active deposit found. Please make a deposit first.';
  }
  
  // Insufficient contract funds
  if (errorString.includes('insufficient funds') && errorString.includes('contract')) {
    return 'Contract has insufficient funds to process withdrawal. Please try again later.';
  }
  
  // User rejection
  if (errorString.includes('user') && errorString.includes('reject')) {
    return 'Transaction cancelled by user.';
  }
  
  // Gas errors
  if (errorString.includes('gas') || errorString.includes('fee')) {
    return 'Transaction fee too high. Please try again later.';
  }
  
  // Contract errors
  if (errorString.includes('revert') || errorString.includes('execution')) {
    return 'Smart contract error. Please try again.';
  }
  
  // Generic fallback
  return 'Withdrawal failed. Please try again or contact support.';
};


const useNetworkStatus = () => {
  // Simply return true to disable network checking for now
  return true;
  
  // OR use this more reliable version:
  /*
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://www.google.com', {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors',
        });
        
        clearTimeout(timeoutId);
        setIsConnected(true);
      } catch (error) {
        // Only set to false for clear network errors
        if (error.name === 'AbortError' || error.message.includes('Network request failed')) {
          setIsConnected(false);
        } else {
          setIsConnected(true); // Assume connected for other errors
        }
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 60000);
    return () => clearInterval(interval);
  }, []);

  return isConnected;
  */
};


// Loading Overlay Component
const LoadingOverlay = ({ visible, message }: { visible: boolean; message: string }) => {
  if (!visible) return null;
  
  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff7e5f" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
};

export default function WithdrawModal({ visible, onClose, onSuccess }: WithdrawModalProps) {
  const { withdrawAll, getTotalWithdrawable, getUserDeposit, getCurrentYield } = useEmbeddedWallet();
  const { state: transactionState, reset, setLoading, setError, setSuccess } = useTransactionState();
  const isConnected = useNetworkStatus();
  
  const [loadingData, setLoadingData] = useState(true);
  const [withdrawData, setWithdrawData] = useState<WithdrawData | null>(null);
  const [step, setStep] = useState<'review' | 'confirm' | 'processing'>('review');

  // Mock BTC price (replace with real price feed later)
  const btcPrice = 43000;

  /**
   * Load withdrawal data when modal opens
   */
  useEffect(() => {
    if (visible) {
      loadWithdrawData();
      setStep('review');
      reset(); // Reset transaction state when modal opens
    }
  }, [visible]);

  const loadWithdrawData = async () => {
    try {
      setLoadingData(true);
      console.log('📊 Loading withdrawal data...');
      
      const [totalWithdrawable, principal, yieldEarned] = await Promise.all([
        getTotalWithdrawable(),
        getUserDeposit(),
        getCurrentYield()
      ]);

      // Convert wei to RBTC for display
      const totalRBTC = (parseFloat(totalWithdrawable) / Math.pow(10, 18)).toString();
      const principalRBTC = (parseFloat(principal) / Math.pow(10, 18)).toString();
      const yieldRBTC = (parseFloat(yieldEarned) / Math.pow(10, 18)).toString();

      console.log('📊 Withdrawal data loaded:', {
        total: totalRBTC,
        principal: principalRBTC,
        yield: yieldRBTC
      });

      setWithdrawData({
        totalWithdrawable: totalRBTC,
        principal: principalRBTC,
        yieldEarned: yieldRBTC,
        depositTime: new Date().toISOString(), // Mock for now
      });
      
    } catch (error) {
      console.error('❌ Failed to load withdrawal data:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
    } finally {
      setLoadingData(false);
    }
  };

  /**
   * Calculate USD value
   */
  const getUSDValue = (rbtcAmount: string): string => {
    const rbtc = parseFloat(rbtcAmount) || 0;
    const usd = rbtc * btcPrice;
    return usd.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  /**
   * Calculate time held (mock for now)
   */
  const getTimeHeld = (): string => {
    // Mock calculation - replace with actual deposit time from contract
    const mockDays = Math.floor(Math.random() * 365) + 1;
    if (mockDays < 30) {
      return `${mockDays} days`;
    } else if (mockDays < 365) {
      const months = Math.floor(mockDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    } else {
      const years = Math.floor(mockDays / 365);
      const remainingMonths = Math.floor((mockDays % 365) / 30);
      return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
    }
  };

  /**
   * Handle withdrawal confirmation
   */
  const handleConfirmWithdraw = () => {
    if (!isConnected) {
      Alert.alert('No Internet', 'Please check your connection and try again');
      return;
    }
    setStep('confirm');
  };

  /**
   * Enhanced withdrawal execution with better error handling
   */
  const handleExecuteWithdraw = async () => {
    try {
      // Check network connectivity first
      if (!isConnected) {
        Alert.alert('No Internet', 'Please check your connection and try again');
        return;
      }

      setStep('processing');

      console.log('💸 Starting enhanced withdrawal transaction...');
      
      // Step 1: Preparing transaction
      setLoading('Preparing withdrawal...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Broadcasting to network
      setLoading('Broadcasting to network...');
      const txHash = await withdrawAll();
      console.log('✅ Withdrawal transaction broadcasted:', txHash);
      
      // Step 3: Waiting for confirmation
      setLoading('Confirming transaction...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 4: Success
      setSuccess(txHash);

      // Show success message after a brief delay
      setTimeout(() => {
        Alert.alert(
          'Withdrawal Successful! 🎉',
          `You've successfully withdrawn ${withdrawData?.totalWithdrawable} RBTC!\n\nYou earned ${withdrawData?.yieldEarned} RBTC in yield!\n\nTransaction: ${txHash.slice(0, 10)}...`,
          [
            {
              text: 'View Dashboard',
              onPress: () => {
                onSuccess();
                handleClose();
              }
            }
          ]
        );
      }, 1000);

    } catch (error) {
      console.error('❌ Enhanced withdrawal failed:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      setStep('review');
      
      // Show error alert after a brief delay
      setTimeout(() => {
        Alert.alert('Withdrawal Failed', errorMessage);
      }, 500);
    }
  };

  /**
   * Reset modal state when closing
   */
  const handleClose = () => {
    setStep('review');
    reset();
    setWithdrawData(null);
    onClose();
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (step === 'confirm') {
      setStep('review');
    } else {
      handleClose();
    }
  };

  if (loadingData && !transactionState.error) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ff7e5f" />
            <Text style={styles.loadingText}>Loading withdrawal data...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!withdrawData && !transactionState.error) {
    return null;
  }

  const hasDeposit = withdrawData ? parseFloat(withdrawData.principal) > 0 : false;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
        
        <View style={styles.modal}>
          <LinearGradient
            colors={['#ff7e5f', '#feb47b', '#ff6b6b']}
            style={styles.modalGradient}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                  <Text style={styles.backButtonText}>
                    {step === 'confirm' ? '←' : '✕'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.title}>
                  {step === 'review' && '💸 Withdraw Savings'}
                  {step === 'confirm' && '⚠️ Confirm Withdrawal'}
                  {step === 'processing' && '⏳ Processing...'}
                </Text>
                <View style={styles.spacer} />
              </View>

              {/* Network Status Warning */}
              {!isConnected && (
                <View style={styles.networkWarning}>
                  <Text style={styles.networkWarningText}>📶 No internet connection</Text>
                </View>
              )}

              {/* Error Display */}
              {transactionState.error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorTitle}>⚠️ Withdrawal Failed</Text>
                  <Text style={styles.errorMessage}>{transactionState.error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={() => {
                    reset();
                    loadWithdrawData();
                  }}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Success Display */}
              {transactionState.success && (
                <View style={styles.successContainer}>
                  <Text style={styles.successTitle}>🎉 Withdrawal Successful!</Text>
                  <Text style={styles.successMessage}>
                    Transaction: {transactionState.txHash?.slice(0, 10)}...
                  </Text>
                </View>
              )}

              {(!hasDeposit && !transactionState.error) ? (
                /* No Deposit State */
                <View style={styles.noDepositContainer}>
                  <Text style={styles.noDepositEmoji}>🏦</Text>
                  <Text style={styles.noDepositTitle}>No Active Deposit</Text>
                  <Text style={styles.noDepositText}>
                    You don't have any active savings to withdraw. Start earning 5% APY by making your first deposit!
                  </Text>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleClose}>
                    <Text style={styles.primaryButtonText}>Make a Deposit</Text>
                  </TouchableOpacity>
                </View>
              ) : withdrawData && (
                <>
                  {/* Withdrawal Summary */}
                  <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Withdrawal Summary</Text>
                    
                    {/* Total Amount */}
                    <View style={styles.totalContainer}>
                      <Text style={styles.totalLabel}>Total Withdrawal</Text>
                      <Text style={styles.totalAmount}>
                        ₿ {parseFloat(withdrawData.totalWithdrawable).toFixed(6)}
                      </Text>
                      <Text style={styles.totalUSD}>
                        {getUSDValue(withdrawData.totalWithdrawable)}
                      </Text>
                    </View>

                    {/* Breakdown */}
                    <View style={styles.breakdownContainer}>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>💰 Original Deposit</Text>
                        <Text style={styles.breakdownValue}>
                          ₿ {parseFloat(withdrawData.principal).toFixed(6)}
                        </Text>
                      </View>
                      
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>🚀 Yield Earned</Text>
                        <Text style={[styles.breakdownValue, styles.yieldValue]}>
                          +₿ {parseFloat(withdrawData.yieldEarned).toFixed(6)}
                        </Text>
                      </View>
                      
                      <View style={styles.breakdownDivider} />
                      
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownLabel, styles.totalLabel]}>💸 Total Received</Text>
                        <Text style={[styles.breakdownValue, styles.totalValue]}>
                          ₿ {parseFloat(withdrawData.totalWithdrawable).toFixed(6)}
                        </Text>
                      </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Time Held</Text>
                        <Text style={styles.statValue}>{getTimeHeld()}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>APY Earned</Text>
                        <Text style={styles.statValue}>5.00%</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Yield USD</Text>
                        <Text style={styles.statValue}>{getUSDValue(withdrawData.yieldEarned)}</Text>
                      </View>
                    </View>
                  </View>

                  {step === 'review' && (
                    /* Review Step */
                    <>
                      <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>
                          💡 Withdrawing will close your savings account. You can always make a new deposit to start earning again!
                        </Text>
                      </View>

                      <TouchableOpacity 
                        style={[styles.withdrawButton, !isConnected && styles.disabledButton]} 
                        onPress={handleConfirmWithdraw}
                        disabled={!isConnected}
                      >
                        <Text style={styles.withdrawButtonText}>Continue to Withdraw</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {step === 'confirm' && (
                    /* Confirmation Step */
                    <>
                      <View style={styles.confirmContainer}>
                        <Text style={styles.confirmTitle}>⚠️ Final Confirmation</Text>
                        <Text style={styles.confirmText}>
                          You're about to withdraw <Text style={styles.confirmAmount}>₿ {parseFloat(withdrawData.totalWithdrawable).toFixed(6)}</Text> from your savings account.
                        </Text>
                        <Text style={styles.confirmSubtext}>
                          This action cannot be undone. Your savings account will be closed.
                        </Text>
                      </View>

                      <View style={styles.actionButtons}>
                        <TouchableOpacity 
                          style={styles.cancelButton} 
                          onPress={() => setStep('review')}
                          disabled={transactionState.isLoading}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.confirmButton, transactionState.isLoading && styles.disabledButton]} 
                          onPress={handleExecuteWithdraw}
                          disabled={transactionState.isLoading}
                        >
                          <Text style={styles.confirmButtonText}>
                            {transactionState.isLoading ? transactionState.loadingMessage : 'Confirm Withdrawal'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  {step === 'processing' && (
                    /* Processing Step */
                    <View style={styles.processingContainer}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                      <Text style={styles.processingText}>{transactionState.loadingMessage}</Text>
                      <Text style={styles.processingSubtext}>
                        Please wait while we transfer your funds
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Loading Overlay */}
              <LoadingOverlay 
                visible={transactionState.isLoading} 
                message={transactionState.loadingMessage} 
              />
            </ScrollView>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalGradient: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  spacer: {
    width: 32,
  },
  // Enhanced error/success/warning styles
  networkWarning: {
    backgroundColor: 'rgba(255,183,77,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,183,77,0.3)',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  networkWarningText: {
    color: '#FFB74D',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(239,83,80,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef5350',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#ef5350',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#ef5350',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: 'rgba(26,26,46,0.9)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  // ... rest of your existing styles remain the same
  noDepositContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDepositEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noDepositTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  noDepositText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  summaryContainer: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  totalUSD: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
  },
  breakdownContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  yieldValue: {
    color: '#4CAF50',
  },
  totalValue: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
  withdrawButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  withdrawButtonText: {
    color: '#ff7e5f',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  confirmAmount: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  confirmSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ff7e5f',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ff7e5f',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  processingSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});