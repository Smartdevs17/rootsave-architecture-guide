import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useEmbeddedWallet } from '../../contexts/EmbeddedWalletContext';
import BiometricService from '../../services/BiometricService';
import { validateMnemonic } from '../../utils/walletUtils';
import MnemonicDisplay from './MnemonicDisplay';
import MnemonicConfirmation from './MnemonicConfirmation';

type SetupStep = 'welcome' | 'create-or-import' | 'show-mnemonic' | 'confirm-mnemonic' | 'import-mnemonic' | 'biometric-setup' | 'complete';

interface SetupWalletProps {
  onComplete: () => void; // Navigate to main app
}

export default function SetupWallet({ onComplete }: SetupWalletProps) {
  const { generateWallet, importWallet } = useEmbeddedWallet();
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [importMnemonicInput, setImportMnemonicInput] = useState('');
  const [mnemonicConfirmation, setMnemonicConfirmation] = useState<string[]>([]);
  const [biometricType, setBiometricType] = useState('');

  /**
   * Check biometric availability on component mount
   */
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      console.log('🔧 SetupWallet: Checking biometric availability...');
      const { shouldEnable, biometricType: type } = await BiometricService.promptEnableBiometrics();
      setBiometricType(type);
      console.log('🔧 SetupWallet: Biometric type:', type, 'Should enable:', shouldEnable);
      
      if (!shouldEnable) {
        Alert.alert(
          'Biometric Authentication Required',
          'This app requires biometric authentication (Face ID, Touch ID, or Fingerprint) to securely store your wallet. Please enable biometrics in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ SetupWallet: Failed to check biometric availability:', error);
    }
  };

  /**
   * Generate new wallet flow
   */
  const handleGenerateWallet = async () => {
    try {
      console.log('🔧 SetupWallet: handleGenerateWallet started');
      setLoading(true);
      console.log('🔧 SetupWallet: Loading state set to true');
      
      // Add small delay to ensure loading state is visible
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('🔧 SetupWallet: Calling generateWallet...');
      const mnemonic = await generateWallet();
      console.log('🔧 SetupWallet: Wallet generated successfully, mnemonic length:', mnemonic.length);
      
      setGeneratedMnemonic(mnemonic);
      setCurrentStep('show-mnemonic');
      console.log('🔧 SetupWallet: Step changed to show-mnemonic');
      
    } catch (error) {
      console.error('❌ SetupWallet: Failed to generate wallet:', error);
      Alert.alert(
        'Error', 
        `Failed to generate wallet: ${error instanceof Error ? error.message : 'Unknown error. Please try again.'}`
      );
    } finally {
      console.log('🔧 SetupWallet: Setting loading to false');
      setLoading(false);
    }
  };

// Fixed handleImportWallet function for SetupWallet.tsx

// Fixed handleImportWallet function for your SetupWallet.tsx

/**
 * Import existing wallet flow - FIXED LOADING STATE
 */
const handleImportWallet = async () => {
  try {
    console.log('🔧 SetupWallet: handleImportWallet started');
    
    // Validate mnemonic BEFORE setting loading state
    const trimmedMnemonic = importMnemonicInput.trim();
    if (!validateMnemonic(trimmedMnemonic)) {
      Alert.alert('Invalid Mnemonic', 'Please enter a valid 12 or 24 word mnemonic phrase.');
      return;
    }

    setLoading(true);
    console.log('🔧 SetupWallet: Loading state set to true');
    
    // ✅ FIXED: Force a small delay to ensure loading state renders in UI
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('🔧 SetupWallet: Calling importWallet...');
    await importWallet(trimmedMnemonic);
    console.log('🔧 SetupWallet: Wallet imported successfully');
    
    // ✅ FIXED: Small delay before transitioning to show success
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCurrentStep('biometric-setup');
    console.log('🔧 SetupWallet: Step changed to biometric-setup');
    
  } catch (error) {
    console.error('❌ SetupWallet: Failed to import wallet:', error);
    
    // Better error handling with specific messages
    let errorMessage = 'Please check your mnemonic phrase and try again.';
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to store wallet')) {
        errorMessage = 'Unable to securely store your wallet. Please ensure your device has screen lock enabled.';
      } else if (error.message.includes('Invalid mnemonic')) {
        errorMessage = 'Invalid recovery phrase. Please check that all words are spelled correctly.';
      } else {
        errorMessage = error.message;
      }
    }
    
    Alert.alert('Import Failed', errorMessage);
  } finally {
    console.log('🔧 SetupWallet: Setting loading to false');
    setLoading(false);
  }
};

// Also update renderImportMnemonic to show loading better
const renderImportMnemonic = () => (
  <View style={styles.stepContainer}>
    <Text style={styles.title}>Import Your Wallet</Text>
    <Text style={styles.subtitle}>
      Enter your 12 or 24 word recovery phrase
    </Text>

    <TextInput
      style={[
        styles.mnemonicInput,
        loading && { backgroundColor: '#F3F4F6', color: '#9CA3AF' }
      ]}
      value={importMnemonicInput}
      onChangeText={setImportMnemonicInput}
      placeholder="Enter your recovery phrase..."
      placeholderTextColor="#9CA3AF"
      multiline
      autoCapitalize="none"
      autoCorrect={false}
      editable={!loading}
    />

    <TouchableOpacity 
      style={[
        styles.primaryButton,
        (!importMnemonicInput.trim() || loading) && styles.buttonDisabled
      ]} 
      onPress={handleImportWallet}
      disabled={loading || !importMnemonicInput.trim()}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Importing...</Text>
        </View>
      ) : (
        <Text style={styles.primaryButtonText}>Import Wallet</Text>
      )}
    </TouchableOpacity>

    <TouchableOpacity 
      style={[styles.secondaryButton, loading && styles.buttonDisabled]} 
      onPress={() => setCurrentStep('create-or-import')}
      disabled={loading}
    >
      <Text style={[styles.secondaryButtonText, loading && { color: '#9CA3AF' }]}>
        Back
      </Text>
    </TouchableOpacity>
    
    {/* ✅ FIXED: Better loading indicator */}
    {loading && (
      <View style={{ marginTop: 24, alignItems: 'center' }}>
        <Text style={styles.loadingText}>
          Securely importing your wallet...
        </Text>
        <Text style={{ 
          fontSize: 12, 
          color: '#9CA3AF', 
          textAlign: 'center', 
          marginTop: 8,
          fontStyle: 'italic' 
        }}>
          This may take a few seconds
        </Text>
      </View>
    )}
  </View>
);

// Additional styles needed
const additionalStyles = StyleSheet.create({
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  loadingIndicator: {
    marginTop: 24,
    alignItems: 'center',
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

  /**
   * Proceed to mnemonic confirmation
   */
  const handleShowMnemonicNext = () => {
    if (!generatedMnemonic) {
      console.warn('⚠️ SetupWallet: No generated mnemonic found');
      return;
    }
    
    console.log('🔧 SetupWallet: Proceeding to mnemonic confirmation');
    // Shuffle words for confirmation
    const words = generatedMnemonic.split(' ');
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    setMnemonicConfirmation(shuffledWords);
    setCurrentStep('confirm-mnemonic');
  };

  /**
   * Verify mnemonic confirmation
   */
  const handleConfirmMnemonic = (selectedWords: string[]) => {
    console.log('🔧 SetupWallet: Verifying mnemonic confirmation...');
    const originalWords = generatedMnemonic.split(' ');
    const isCorrect = originalWords.every((word, index) => word === selectedWords[index]);
    
    if (isCorrect) {
      console.log('✅ SetupWallet: Mnemonic confirmation correct');
      setCurrentStep('biometric-setup');
    } else {
      console.log('❌ SetupWallet: Mnemonic confirmation incorrect');
      Alert.alert(
        'Incorrect Order',
        'Please select the words in the correct order.',
        [{ text: 'Try Again' }]
      );
    }
  };

  /**
   * Complete setup flow
   */
  const handleCompleteSetup = () => {
    console.log('🔧 SetupWallet: Completing setup flow...');
    setCurrentStep('complete');
    setTimeout(() => {
      console.log('🎉 SetupWallet: Setup completed, calling onComplete');
      onComplete();
    }, 2000);
  };

  /**
   * Render welcome screen
   */
  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Welcome to Rootsave</Text>
      <Text style={styles.subtitle}>
        Save Bitcoin on Rootstock and earn 5% APY yield
      </Text>
      
      <View style={styles.featureList}>
        <Text style={styles.feature}>🔒 Secure biometric protection</Text>
        <Text style={styles.feature}>💰 5% Annual Percentage Yield</Text>
        <Text style={styles.feature}>⚡ Built on Rootstock network</Text>
        <Text style={styles.feature}>📱 Simple mobile experience</Text>
      </View>

      <TouchableOpacity 
        style={styles.primaryButton} 
        onPress={() => setCurrentStep('create-or-import')}
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render create or import choice
   */
  const renderCreateOrImport = () => {
    console.log('🔧 SetupWallet: renderCreateOrImport - loading state:', loading);
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.title}>Setup Your Wallet</Text>
        <Text style={styles.subtitle}>
          Create a new wallet or import an existing one
        </Text>

        <TouchableOpacity 
          style={[styles.primaryButton, { marginBottom: 16 }]} 
          onPress={handleGenerateWallet}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Creating...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Create New Wallet</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, loading && styles.buttonDisabled]} 
          onPress={() => setCurrentStep('import-mnemonic')}
          disabled={loading}
        >
          <Text style={[styles.secondaryButtonText, loading && { color: '#9CA3AF' }]}>
            Import Existing Wallet
          </Text>
        </TouchableOpacity>
        
        {loading && (
          <Text style={styles.loadingText}>
            This may take a few seconds...
          </Text>
        )}
      </View>
    );
  };

  

  /**
   * Render biometric setup
   */
  const renderBiometricSetup = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Secure Your Wallet</Text>
      <Text style={styles.subtitle}>
        Your wallet will be protected with {biometricType}
      </Text>

      <View style={styles.biometricIcon}>
        <Text style={styles.biometricEmoji}>
          {biometricType.includes('Face') ? '👤' : '👆'}
        </Text>
      </View>

      <Text style={styles.biometricDescription}>
        Use {biometricType} to securely access your wallet. Your private keys are encrypted and stored safely on your device.
      </Text>

      <TouchableOpacity 
        style={styles.primaryButton} 
        onPress={handleCompleteSetup}
      >
        <Text style={styles.primaryButtonText}>Setup Complete</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render completion
   */
  const renderComplete = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>🎉 All Set!</Text>
      <Text style={styles.subtitle}>
        Your wallet is ready. You can now start saving Bitcoin on Rootstock!
      </Text>
      
      <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 32 }} />
      
      <Text style={styles.loadingText}>
        Launching your dashboard...
      </Text>
    </View>
  );

  /**
   * Render current step
   */
  const renderCurrentStep = () => {
    console.log('🔧 SetupWallet: Rendering step:', currentStep);
    
    switch (currentStep) {
      case 'welcome':
        return renderWelcome();
      case 'create-or-import':
        return renderCreateOrImport();
      case 'show-mnemonic':
        return (
          <MnemonicDisplay 
            mnemonic={generatedMnemonic}
            onNext={handleShowMnemonicNext}
          />
        );
      case 'confirm-mnemonic':
        return (
          <MnemonicConfirmation
            originalMnemonic={generatedMnemonic}
            shuffledWords={mnemonicConfirmation}
            onConfirm={handleConfirmMnemonic}
          />
        );
      case 'import-mnemonic':
        return renderImportMnemonic();
      case 'biometric-setup':
        return renderBiometricSetup();
      case 'complete':
        return renderComplete();
      default:
        return renderWelcome();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderCurrentStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stepContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featureList: {
    marginBottom: 48,
  },
  feature: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    paddingLeft: 8,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  mnemonicInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  biometricIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  biometricEmoji: {
    fontSize: 64,
  },
  biometricDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
inputDisabled: {
  backgroundColor: '#F3F4F6', 
  color: '#9CA3AF',
},
loadingIndicator: {
  marginTop: 24,
  alignItems: 'center',
},
loadingSubtext: {
  fontSize: 12,
  color: '#9CA3AF', 
  textAlign: 'center',
  marginTop: 8,
  fontStyle: 'italic',
},

});