import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Clipboard,
  Share,
  Linking,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { useEmbeddedWallet } from '../../contexts/EmbeddedWalletContext';
import BiometricService from '../../services/BiometricService';
import { getCurrentNetwork } from '../../constants/networks';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onLockWallet: () => void;
  onResetWallet: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  visible, 
  onClose, 
  onLockWallet,
  onResetWallet 
}) => {
  const { address } = useEmbeddedWallet();
  const [showQR, setShowQR] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [currentMnemonic, setCurrentMnemonic] = useState<string>('');

  // Get current network configuration
  const currentNetwork = getCurrentNetwork();
  
  const getContractAddress = () => {
    if (currentNetwork.chainId === 31) {
      return process.env.EXPO_PUBLIC_ROOTSAVE_CONTRACT_TESTNET!;
    }
    return process.env.EXPO_PUBLIC_ROOTSAVE_CONTRACT_MAINNET || process.env.EXPO_PUBLIC_ROOTSAVE_CONTRACT_TESTNET!;
  };
  
  const CONTRACT_ADDRESS = getContractAddress();
  const EXPLORER_BASE_URL = currentNetwork.explorerUrl;

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setString(text);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const shareAddress = async () => {
    if (!address) return;
    
    try {
      await Share.share({
        message: `My Rootsave Wallet Address: ${address}`,
        title: 'Rootsave Wallet Address'
      });
    } catch (error) {
      console.error('Error sharing address:', error);
    }
  };

  const handleLockWallet = () => {
    Alert.alert(
      'Lock Wallet',
      'This will lock your wallet and require biometric authentication to access it again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock',
          style: 'destructive',
          onPress: () => {
            onClose(); // Close modal first
            onLockWallet(); // Then lock wallet
          }
        }
      ]
    );
  };

  const handleViewRecoveryPhrase = async () => {
    try {
      const isAuthenticated = await BiometricService.authenticateWithBiometrics();
      if (isAuthenticated) {
        // Try to get wallet with mnemonic
        const result = await BiometricService.authenticateAndGetWalletWithMnemonic();
        if (result.success && result.credentials?.mnemonic) {
          setCurrentMnemonic(result.credentials.mnemonic);
          setShowMnemonic(true);
        } else {
          Alert.alert('Error', 'Unable to retrieve recovery phrase');
        }
      }
    } catch (error) {
      Alert.alert('Authentication Failed', 'Unable to verify your identity');
    }
  };

  const handleClearWallet = () => {
    Alert.alert(
      'Clear Wallet Data',
      'This will permanently delete your wallet from this device. Make sure you have backed up your recovery phrase!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Warning',
              'Are you absolutely sure? This action cannot be undone and you may lose access to your funds if you haven\'t backed up your recovery phrase.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Wallet',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await BiometricService.clearWalletData();
                      onClose(); // Close modal first
                      onResetWallet(); // Then reset to setup
                    } catch (error) {
                      Alert.alert('Error', 'Failed to clear wallet data');
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const openInExplorer = (address: string) => {
    const url = `${EXPLORER_BASE_URL}/address/${address}`;
    Linking.openURL(url);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!visible) return null;

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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Wallet Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet Information</Text>
            
            <TouchableOpacity 
              style={styles.card}
              onPress={() => address && copyToClipboard(address, 'Wallet address')}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="wallet-outline" size={24} color="#fff" />
                  <Text style={styles.cardTitle}>Wallet Address</Text>
                </View>
                <Text style={styles.addressText}>
                  {address ? formatAddress(address) : 'No address'}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => address && copyToClipboard(address, 'Wallet address')}
                  >
                    <Ionicons name="copy-outline" size={16} color="#fff" />
                    <Text style={styles.actionText}>Copy</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={shareAddress}
                  >
                    <Ionicons name="share-outline" size={16} color="#fff" />
                    <Text style={styles.actionText}>Share</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => setShowQR(!showQR)}
                  >
                    <Ionicons name="qr-code-outline" size={16} color="#fff" />
                    <Text style={styles.actionText}>QR</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* QR Code Display */}
            {showQR && address && (
              <View style={styles.qrContainer}>
                <QRCode
                  value={address}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
                <Text style={styles.qrLabel}>Scan to get wallet address</Text>
              </View>
            )}
          </View>

          {/* Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            
            <TouchableOpacity style={styles.card} onPress={handleViewRecoveryPhrase}>
              <LinearGradient
                colors={['rgba(255,159,67,0.2)', 'rgba(255,107,107,0.1)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="key-outline" size={24} color="#FFB347" />
                  <Text style={styles.cardTitle}>View Recovery Phrase</Text>
                </View>
                <Text style={styles.cardDescription}>
                  View your 12-word recovery phrase (biometric authentication required)
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.card} onPress={handleLockWallet}>
              <LinearGradient
                colors={['rgba(255,107,107,0.2)', 'rgba(255,159,67,0.1)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="lock-closed-outline" size={24} color="#FF6B6B" />
                  <Text style={styles.cardTitle}>Lock Wallet</Text>
                </View>
                <Text style={styles.cardDescription}>
                  Lock your wallet and require biometric authentication
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Network Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Network Information</Text>
            
            <View style={styles.card}>
              <LinearGradient
                colors={['rgba(102,126,234,0.2)', 'rgba(118,75,162,0.1)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="globe-outline" size={24} color="#667eea" />
                  <Text style={styles.cardTitle}>{currentNetwork.name}</Text>
                </View>
                <View style={styles.networkInfo}>
                  <Text style={styles.networkLabel}>Chain ID:</Text>
                  <Text style={styles.networkValue}>{currentNetwork.chainId}</Text>
                </View>
                <View style={styles.networkInfo}>
                  <Text style={styles.networkLabel}>Status:</Text>
                  <Text style={[styles.networkValue, { color: currentNetwork.chainId === 31 ? '#FFB347' : '#4CAF50' }]}>
                    {currentNetwork.chainId === 31 ? 'Testnet' : 'Mainnet'}
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <TouchableOpacity 
              style={styles.card}
              onPress={() => copyToClipboard(CONTRACT_ADDRESS, 'Contract address')}
            >
              <LinearGradient
                colors={['rgba(171,71,188,0.2)', 'rgba(240,147,251,0.1)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="document-text-outline" size={24} color="#ab47bc" />
                  <Text style={styles.cardTitle}>Smart Contract</Text>
                </View>
                <Text style={styles.addressText}>
                  {formatAddress(CONTRACT_ADDRESS)}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => copyToClipboard(CONTRACT_ADDRESS, 'Contract address')}
                  >
                    <Ionicons name="copy-outline" size={16} color="#fff" />
                    <Text style={styles.actionText}>Copy</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => openInExplorer(CONTRACT_ADDRESS)}
                  >
                    <Ionicons name="open-outline" size={16} color="#fff" />
                    <Text style={styles.actionText}>Explorer</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Reset Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reset</Text>
            
            <TouchableOpacity style={styles.card} onPress={handleClearWallet}>
              <LinearGradient
                colors={['rgba(239,83,80,0.3)', 'rgba(239,83,80,0.1)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="trash-outline" size={24} color="#ef5350" />
                  <Text style={[styles.cardTitle, styles.dangerText]}>Clear Wallet Data</Text>
                </View>
                <Text style={[styles.cardDescription, styles.dangerText]}>
                  Permanently delete your wallet from this device
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Recovery Phrase Modal */}
          {showMnemonic && currentMnemonic && (
            <View style={styles.overlay}>
              <View style={styles.modal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Recovery Phrase</Text>
                  <TouchableOpacity onPress={() => {
                    setShowMnemonic(false);
                    setCurrentMnemonic('');
                  }}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.warningText}>
                  ⚠️ Never share this phrase with anyone. Store it safely offline.
                </Text>
                
                <View style={styles.mnemonicGrid}>
                  {currentMnemonic.split(' ').map((word, index) => (
                    <View key={index} style={styles.mnemonicWord}>
                      <Text style={styles.mnemonicNumber}>{index + 1}</Text>
                      <Text style={styles.mnemonicText}>{word}</Text>
                    </View>
                  ))}
                </View>
                
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(currentMnemonic, 'Recovery phrase')}
                >
                  <Ionicons name="copy-outline" size={20} color="#667eea" />
                  <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  scrollContent: {
    paddingBottom: 40,
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
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  dangerText: {
    color: '#ef5350',
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  addressText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
  },
  qrLabel: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
    fontSize: 14,
  },
  networkInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  networkLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  networkValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'rgba(26,26,46,0.95)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  warningText: {
    color: '#FFB347',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mnemonicWord: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mnemonicNumber: {
    color: '#667eea',
    fontSize: 12,
    fontWeight: 'bold',
    width: 20,
  },
  mnemonicText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102,126,234,0.2)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  copyButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SettingsModal;