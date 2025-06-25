import 'react-native-get-random-values';
import '@walletconnect/react-native-compat';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  SafeAreaView,
  Alert 
} from 'react-native';
import { AppProviders } from './src/providers';
import { AuthFlow } from './src/screens/';
import { useEmbeddedWallet } from './src/contexts/EmbeddedWalletContext';
import VaultDashboard from './src/screens/main/VaultDashboard';
import DepositModal from './src/screens/main/DepositModal';
import WithdrawModal from './src/screens/main/WithdrawModal';
import SettingsModal from './src/screens/main/SettingsModal';
import BiometricAuth from './src/screens/auth/BiometricAuth';
import TransactionHistoryModal from './src/screens/main/TransactionHistoryModal'; // 👈 ADD IMPORT

/**
 * App Content - Handles main app state with three-state authentication
 */
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false); // 👈 ADD STATE
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { isInitialized, isUnlocked, lockWallet } = useEmbeddedWallet();

  // Reset authentication when wallet is locked
  React.useEffect(() => {
    if (!isUnlocked && isAuthenticated) {
      setIsAuthenticated(false);
    }
  }, [isUnlocked, isAuthenticated]);

  /**
   * Handle successful authentication (from setup flow)
   */
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  /**
   * Handle successful unlock (from biometric auth)
   */
  const handleUnlockSuccess = () => {
    setIsAuthenticated(true);
  };

  /**
   * Handle reset wallet (from biometric auth)
   */
  const handleResetWallet = () => {
    console.log('🔄 Resetting wallet, returning to setup flow...');
    setIsAuthenticated(false);
    // The useEmbeddedWallet context will detect no wallet exists and show setup
  };

  /**
   * Handle deposit action - SHOW DEPOSIT MODAL
   */
  const handleDeposit = () => {
    setShowDepositModal(true);
  };

  /**
   * Handle successful deposit - TRIGGER DASHBOARD REFRESH
   */
  const handleDepositSuccess = () => {
    console.log('🎉 Deposit successful, refreshing dashboard...');
    setRefreshTrigger(prev => prev + 1);
  };

  /**
   * Handle withdraw action - SHOW WITHDRAW MODAL
   */
  const handleWithdraw = () => {
    setShowWithdrawModal(true);
  };

  /**
   * Handle successful withdrawal - TRIGGER DASHBOARD REFRESH
   */
  const handleWithdrawSuccess = () => {
    console.log('🎉 Withdrawal successful, refreshing dashboard...');
    setRefreshTrigger(prev => prev + 1);
  };

  /**
   * Handle settings action - SHOW SETTINGS MODAL
   */
  const handleSettings = () => {
    setShowSettingsModal(true); // 👈 UPDATED: Show modal instead of alert
  };

  /**
   * Handle wallet lock from settings
   */
  const handleLockWalletFromSettings = () => {
    Alert.alert(
      'Wallet Locked',
      'Your wallet has been locked successfully',
      [{ text: 'OK' }]
    );
    lockWallet();
    setIsAuthenticated(false);
  };

  /**
   * Handle wallet reset from settings
   */
  const handleResetWalletFromSettings = () => {
    console.log('🔄 Wallet reset from settings, returning to setup flow...');
    setIsAuthenticated(false);
    // The useEmbeddedWallet context will detect no wallet exists and show setup
  };

  /**
   * Handle wallet lock from dashboard (existing functionality)
   */
  const handleLockWallet = () => {
    Alert.alert(
      'Lock Wallet',
      'Are you sure you want to lock your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Lock', 
          style: 'destructive',
          onPress: () => {
            lockWallet();
            setIsAuthenticated(false);
          }
        }
      ]
    );
  };

  /**
   * Handle transaction history action - SHOW HISTORY MODAL
   */
  const handleHistory = () => {
    setShowHistoryModal(true); // 👈 ADD HANDLER
  };

  // 🎯 THREE-STATE AUTHENTICATION LOGIC:

  // 1. Wallet exists and unlocked → Show main app
  if (isAuthenticated && isUnlocked) {
    return (
      <>
        <VaultDashboard
          onDeposit={handleDeposit}
          onWithdraw={handleWithdraw}
          onSettings={handleSettings}
          onHistory={handleHistory} // 👈 ADD THIS PROP
          onLockWallet={handleLockWallet}
          refreshTrigger={refreshTrigger}
        />
        
        <DepositModal
          visible={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onSuccess={handleDepositSuccess}
        />
        
        <WithdrawModal
          visible={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={handleWithdrawSuccess}
        />
        
        <SettingsModal
          visible={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onLockWallet={handleLockWalletFromSettings}
          onResetWallet={handleResetWalletFromSettings}
        />
        
        {/* 👇 ADD TRANSACTION HISTORY MODAL */}
        <TransactionHistoryModal
          visible={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
        />
      </>
    );
  }

  // 2. Wallet exists but locked → Show biometric unlock
  if (isInitialized && !isUnlocked) {
    return (
      <BiometricAuth
        onSuccess={handleUnlockSuccess}
        onBackToSetup={handleResetWallet}
      />
    );
  }

  // 3. No wallet exists → Show setup flow
  return <AuthFlow onAuthenticated={handleAuthenticated} />;
}

/**
 * Root App component
 */
export default function App() {
  return (
    <AppProviders>
      <SafeAreaView style={styles.safeArea}>
        <AppContent />
        <StatusBar style="light" />
      </SafeAreaView>
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Match VaultDashboard dark theme
  },
});