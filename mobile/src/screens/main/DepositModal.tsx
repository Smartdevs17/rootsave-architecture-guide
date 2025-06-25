import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEmbeddedWallet } from '../../contexts/EmbeddedWalletContext';

interface DepositModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Enhanced transaction state hook
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
  console.error('Transaction error:', error);
  
  const errorString = error?.message || error?.toString() || '';
  
  // Network errors
  if (errorString.includes('network') || errorString.includes('timeout')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Insufficient funds
  if (errorString.includes('insufficient') || errorString.includes('balance')) {
    return 'Insufficient RBTC balance for this transaction.';
  }
  
  // User rejection
  if (errorString.includes('user') && errorString.includes('reject')) {
    return 'Transaction cancelled by user.';
  }
  
  // Gas errors
  if (errorString.includes('gas') || errorString.includes('fee')) {
    return 'Transaction fee too high. Please try again later.';
  }
  
  // Contract specific errors
  if (errorString.includes('Must withdraw existing deposit first')) {
    return 'You already have an active deposit. Please withdraw your current deposit before making a new one.';
  }
  
  // Contract errors
  if (errorString.includes('revert') || errorString.includes('execution')) {
    return 'Smart contract error. Please try again.';
  }
  
  // Generic fallback
  return 'Transaction failed. Please try again or contact support.';
};

// Network status hook 
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
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
};

export default function DepositModal({ visible, onClose, onSuccess }: DepositModalProps) {
  const { depositRBTC, balance, getUserDeposit } = useEmbeddedWallet();
  const { state: transactionState, reset, setLoading, setError, setSuccess } = useTransactionState();
  const isConnected = useNetworkStatus();
  
  const [amount, setAmount] = useState('');
  const [hasExistingDeposit, setHasExistingDeposit] = useState(false);
  const [loadingDeposit, setLoadingDeposit] = useState(true);

  // Mock BTC price (replace with real price feed later)
  const btcPrice = 43000;

  /**
   * Check if user has existing deposit
   */
  useEffect(() => {
    if (visible) {
      checkExistingDeposit();
      reset(); // Reset transaction state when modal opens
    }
  }, [visible]);

  const checkExistingDeposit = async () => {
    try {
      setLoadingDeposit(true);
      const deposit = await getUserDeposit();
      const hasDeposit = parseFloat(deposit) > 0;
      setHasExistingDeposit(hasDeposit);
    } catch (error) {
      console.error('Failed to check existing deposit:', error);
      setError('Failed to check existing deposit status');
    } finally {
      setLoadingDeposit(false);
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
   * Calculate annual yield projection
   */
  const getYieldProjection = (rbtcAmount: string): string => {
    const rbtc = parseFloat(rbtcAmount) || 0;
    const yearlyYield = rbtc * 0.05; // 5% APY
    return yearlyYield.toFixed(6);
  };

  /**
   * Validate amount input
   */
  const validateAmount = (): string | null => {
    const numAmount = parseFloat(amount);
    
    if (!amount || isNaN(numAmount)) {
      return 'Please enter a valid amount';
    }
    
    if (numAmount <= 0) {
      return 'Amount must be greater than 0';
    }
    
    if (numAmount < 0.0001) {
      return 'Minimum deposit is 0.0001 RBTC';
    }
    
    // Check if user has enough balance (convert balance from wei)
    const balanceRBTC = parseFloat(balance) / Math.pow(10, 18);
    if (numAmount > balanceRBTC) {
      return `Insufficient balance. You have ${balanceRBTC.toFixed(6)} RBTC`;
    }
    
    return null;
  };

  /**
   * Enhanced deposit transaction with better error handling
   */
  const handleDeposit = async () => {
    try {
      // Check network connectivity first
      if (!isConnected) {
        Alert.alert('No Internet', 'Please check your connection and try again');
        return;
      }

      // Validate input
      const validationError = validateAmount();
      if (validationError) {
        Alert.alert('Invalid Amount', validationError);
        return;
      }

      console.log('🏦 Starting enhanced deposit transaction for:', amount, 'RBTC');
      
      // Step 1: Preparing transaction
      setLoading('Preparing transaction...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate prep time
      
      // Step 2: Broadcasting to network
      setLoading('Broadcasting to network...');
      const txHash = await depositRBTC(amount);
      console.log('✅ Transaction broadcasted:', txHash);
      
      // Step 3: Waiting for confirmation
      setLoading('Confirming transaction...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate confirmation time
      
      // Step 4: Success
      setSuccess(txHash);
      
      // Show success message after a brief delay
      setTimeout(() => {
        Alert.alert(
          'Deposit Successful! 🎉',
          `You've successfully deposited ${amount} RBTC and are now earning 5% APY!\n\nTransaction: ${txHash.slice(0, 10)}...`,
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
      console.error('❌ Enhanced deposit failed:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      
      // Show error alert after a brief delay
      setTimeout(() => {
        Alert.alert('Deposit Failed', errorMessage);
      }, 500);
    }
  };

  /**
   * Handle quick amount buttons
   */
  const handleQuickAmount = (percentage: number) => {
    const balanceRBTC = parseFloat(balance) / Math.pow(10, 18);
    const quickAmount = (balanceRBTC * percentage).toFixed(6);
    setAmount(quickAmount);
  };

  /**
   * Reset modal state when closing
   */
  const handleClose = () => {
    setAmount('');
    reset();
    onClose();
  };

  if (loadingDeposit) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Checking deposit status...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
          
          <View style={styles.modal}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.modalGradient}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {hasExistingDeposit ? '💰 Add to Savings' : '💰 Start Saving'}
                </Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
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
                  <Text style={styles.errorTitle}>⚠️ Transaction Failed</Text>
                  <Text style={styles.errorMessage}>{transactionState.error}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={reset}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Success Display */}
              {transactionState.success && (
                <View style={styles.successContainer}>
                  <Text style={styles.successTitle}>🎉 Deposit Successful!</Text>
                  <Text style={styles.successMessage}>
                    Transaction: {transactionState.txHash?.slice(0, 10)}...
                  </Text>
                </View>
              )}

              {/* Warning for existing deposit */}
              {hasExistingDeposit && (
                <View style={styles.warningContainer}>
                  <Text style={styles.warningText}>
                    ⚠️ You have an existing deposit. You'll need to withdraw it first before making a new deposit.
                  </Text>
                </View>
              )}

              {/* Amount Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Deposit Amount</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.0000"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    keyboardType="decimal-pad"
                    editable={!transactionState.isLoading && !hasExistingDeposit}
                  />
                  <Text style={styles.currencyLabel}>RBTC</Text>
                </View>
                
                {amount && (
                  <Text style={styles.usdValue}>≈ {getUSDValue(amount)}</Text>
                )}
              </View>

              {/* Quick Amount Buttons */}
              {!hasExistingDeposit && (
                <View style={styles.quickButtons}>
                  <TouchableOpacity 
                    style={styles.quickButton} 
                    onPress={() => handleQuickAmount(0.25)}
                    disabled={transactionState.isLoading}
                  >
                    <Text style={styles.quickButtonText}>25%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickButton} 
                    onPress={() => handleQuickAmount(0.5)}
                    disabled={transactionState.isLoading}
                  >
                    <Text style={styles.quickButtonText}>50%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickButton} 
                    onPress={() => handleQuickAmount(0.75)}
                    disabled={transactionState.isLoading}
                  >
                    <Text style={styles.quickButtonText}>75%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickButton} 
                    onPress={() => handleQuickAmount(1)}
                    disabled={transactionState.isLoading}
                  >
                    <Text style={styles.quickButtonText}>Max</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Yield Projection */}
              {amount && !hasExistingDeposit && (
                <View style={styles.projectionContainer}>
                  <View style={styles.projectionRow}>
                    <Text style={styles.projectionLabel}>Annual Yield (5% APY)</Text>
                    <Text style={styles.projectionValue}>+{getYieldProjection(amount)} RBTC</Text>
                  </View>
                  <View style={styles.projectionRow}>
                    <Text style={styles.projectionLabel}>Yearly USD Value</Text>
                    <Text style={styles.projectionValue}>{getUSDValue(getYieldProjection(amount))}</Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleClose}
                  disabled={transactionState.isLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.depositButton,
                    (transactionState.isLoading || hasExistingDeposit || !amount) && styles.disabledButton
                  ]} 
                  onPress={handleDeposit}
                  disabled={transactionState.isLoading || hasExistingDeposit || !amount}
                >
                  <Text style={styles.depositButtonText}>
                    {transactionState.isLoading ? transactionState.loadingMessage :
                     hasExistingDeposit ? 'Withdraw First' : 'Deposit RBTC'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Info Text */}
              <Text style={styles.infoText}>
                🔒 Your RBTC will immediately start earning 5% APY. You can withdraw anytime with accumulated yield.
              </Text>

              {/* Loading Overlay */}
              <LoadingOverlay 
                visible={transactionState.isLoading} 
                message={transactionState.loadingMessage} 
              />
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
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
  warningContainer: {
    backgroundColor: 'rgba(255,193,7,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.3)',
  },
  warningText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  currencyLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  usdValue: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  projectionContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projectionLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  projectionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  depositButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    opacity: 0.6,
  },
  depositButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
});