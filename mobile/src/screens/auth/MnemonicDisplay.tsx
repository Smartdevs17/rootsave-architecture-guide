import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface MnemonicDisplayProps {
  mnemonic: string;
  onNext: () => void;
}

export default function MnemonicDisplay({ mnemonic, onNext }: MnemonicDisplayProps) {
  const words = mnemonic.split(' ');

  /**
   * Copy mnemonic to clipboard
   */
  const handleCopyMnemonic = async () => {
    try {
      await Clipboard.setStringAsync(mnemonic);
      Alert.alert(
        'Copied!', 
        'Your recovery phrase has been copied to clipboard. Make sure to store it safely and clear your clipboard after writing it down.',
        [{ text: 'OK' }]
      );
      console.log('✅ MnemonicDisplay: Mnemonic copied to clipboard');
    } catch (error) {
      console.error('❌ MnemonicDisplay: Failed to copy mnemonic:', error);
      Alert.alert('Error', 'Failed to copy to clipboard. Please write down the words manually.');
    }
  };

  return (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContentContainer}
    >
      <Text style={styles.title}>Backup Your Wallet</Text>
      <Text style={styles.subtitle}>
        Write down these 12 words in order. You'll need them to recover your wallet.
      </Text>

      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠️ Never share your recovery phrase with anyone. Store it safely offline.
        </Text>
      </View>

      <View style={styles.mnemonicContainer}>
        {words.map((word, index) => (
          <View key={index} style={styles.mnemonicWord}>
            <Text style={styles.mnemonicIndex}>{index + 1}</Text>
            <Text style={styles.mnemonicText}>{word}</Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.copyButton} 
          onPress={handleCopyMnemonic}
        >
          <Text style={styles.copyButtonText}>📋 Copy All Words</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={onNext}
        >
          <Text style={styles.primaryButtonText}>I've Written It Down</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContentContainer: {
    flexGrow: 1,
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
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
  },
  mnemonicContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  mnemonicWord: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 12,
  },
  mnemonicIndex: {
    fontSize: 14,
    color: '#9CA3AF',
    width: 24,
    textAlign: 'right',
    marginRight: 8,
  },
  mnemonicText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 16,
  },
  copyButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});