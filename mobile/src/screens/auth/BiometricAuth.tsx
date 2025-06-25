import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEmbeddedWallet } from '../../contexts/EmbeddedWalletContext';
import BiometricService from '../../services/BiometricService';

interface BiometricAuthProps {
  onSuccess: () => void;
  onBackToSetup?: () => void; // Optional - for reset wallet flow
}

export default function BiometricAuth({ onSuccess, onBackToSetup }: BiometricAuthProps) {
  const { unlockWallet, address } = useEmbeddedWallet();
  
  const [isLoading, setIsLoading] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  /**
   * Initialize screen animations and biometric type
   */
  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      // Get biometric type for display
      const type = await BiometricService.getBiometricType();
      setBiometricType(type);
      
      // Animate screen entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Failed to initialize BiometricAuth:', error);
      setBiometricType('Device Authentication');
    }
  };

  /**
   * Handle biometric authentication
   */
  const handleUnlock = async () => {
    try {
      setIsLoading(true);
      console.log('🔐 BiometricAuth: Starting unlock process...');
      
      const success = await unlockWallet();
      
      if (success) {
        console.log('✅ BiometricAuth: Unlock successful');
        
        // Small delay for success feedback
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        console.log('❌ BiometricAuth: Unlock failed');
        Alert.alert(
          'Authentication Failed',
          'Unable to unlock your wallet. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('BiometricAuth: Unlock error:', error);
      
      let errorMessage = 'Authentication failed. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('User canceled') || error.message.includes('cancelled')) {
          // User cancelled biometric prompt, don't show error
          return;
        } else if (error.message.includes('not available')) {
          errorMessage = 'Biometric authentication not available. Please check your device settings.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Authentication Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle reset wallet (clear and start over)
   */
  const handleResetWallet = () => {
    Alert.alert(
      'Reset Wallet',
      'This will permanently delete your wallet from this device. Make sure you have your recovery phrase saved!\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Wallet',
          style: 'destructive',
          onPress: async () => {
            try {
              await BiometricService.clearWallet();
              if (onBackToSetup) {
                onBackToSetup();
              }
            } catch (error) {
              console.error('Failed to reset wallet:', error);
              Alert.alert('Error', 'Failed to reset wallet. Please try again.');
            }
          }
        }
      ]
    );
  };

  /**
   * Get biometric icon based on type
   */
  const getBiometricIcon = (): string => {
    if (biometricType.includes('Face')) return '👤';
    if (biometricType.includes('Touch') || biometricType.includes('Fingerprint')) return '👆';
    if (biometricType.includes('Passcode') || biometricType.includes('PIN')) return '🔢';
    return '🔐';
  };

  /**
   * Get welcome message based on time
   */
  const getWelcomeMessage = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  /**
   * Format address for display
   */
  const getDisplayAddress = (): string => {
    if (!address || address === 'stored') {
      return 'Your Wallet';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.welcomeText}>{getWelcomeMessage()} 👋</Text>
            <Text style={styles.titleText}>Welcome Back to Rootsave</Text>
            <Text style={styles.subtitleText}>
              Unlock your wallet to continue earning 5% APY
            </Text>
          </View>

          {/* Wallet Info */}
          <View style={styles.walletContainer}>
            <View style={styles.walletIcon}>
              <Text style={styles.walletEmoji}>🏦</Text>
            </View>
            <Text style={styles.walletLabel}>Your Savings Wallet</Text>
            <Text style={styles.walletAddress}>{getDisplayAddress()}</Text>
          </View>

          {/* Biometric Section */}
          <View style={styles.biometricSection}>
            <View style={styles.biometricIconContainer}>
              <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
            </View>
            
            <Text style={styles.biometricTitle}>Secure Access</Text>
            <Text style={styles.biometricDescription}>
              Use {biometricType} to securely unlock your wallet and access your Bitcoin savings.
            </Text>

            {/* Unlock Button */}
            <TouchableOpacity 
              style={[styles.unlockButton, isLoading && styles.disabledButton]} 
              onPress={handleUnlock}
              disabled={isLoading}
            >
              <LinearGradient
                colors={isLoading ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.buttonText}>Unlocking...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonIcon}>{getBiometricIcon()}</Text>
                    <Text style={styles.buttonText}>
                      Unlock with {biometricType}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.securityText}>
              🔒 Your private keys never leave your device
            </Text>
            
            {onBackToSetup && (
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={handleResetWallet}
                disabled={isLoading}
              >
                <Text style={styles.resetButtonText}>
                  Reset Wallet
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  walletContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  walletIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletEmoji: {
    fontSize: 32,
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  biometricSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  biometricIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  biometricIcon: {
    fontSize: 40,
  },
  biometricTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  biometricDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  unlockButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  securityText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resetButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});