import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

interface MnemonicConfirmationProps {
  originalMnemonic: string;
  shuffledWords: string[];
  onConfirm: (selectedWords: string[]) => void;
}

interface WordSlot {
  position: number; // 1-based position (1, 2, 3, etc.)
  correctWord: string;
  selectedWord: string | null;
}

export default function MnemonicConfirmation({ 
  originalMnemonic, 
  shuffledWords, 
  onConfirm 
}: MnemonicConfirmationProps) {
  const [wordSlots, setWordSlots] = useState<WordSlot[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  const originalWords = originalMnemonic.split(' ');

  /**
   * Initialize random word slots and decoy words
   */
  useEffect(() => {
    console.log('🔧 MnemonicConfirmation: Initializing 3 random word verification');
    
    // Select 3 random positions from the mnemonic
    const positions: number[] = [];
    while (positions.length < 3) {
      const randomPos = Math.floor(Math.random() * originalWords.length);
      if (!positions.includes(randomPos)) {
        positions.push(randomPos);
      }
    }
    
    // Sort positions for better UX
    positions.sort((a, b) => a - b);
    
    // Create word slots
    const slots: WordSlot[] = positions.map(pos => ({
      position: pos + 1, // Convert to 1-based
      correctWord: originalWords[pos],
      selectedWord: null,
    }));
    
    setWordSlots(slots);
    
    // Create word choices: correct words + some decoys
    const correctWords = slots.map(slot => slot.correctWord);
    
    // Get random decoy words from shuffled words (excluding correct ones)
    const decoyWords = shuffledWords
      .filter(word => !correctWords.includes(word))
      .slice(0, 6); // Add 6 decoy words
    
    // Combine and shuffle all available words
    const allWords = [...correctWords, ...decoyWords].sort(() => Math.random() - 0.5);
    setAvailableWords(allWords);
    
    console.log('🔧 MnemonicConfirmation: Selected positions:', positions.map(p => p + 1));
    console.log('🔧 MnemonicConfirmation: Correct words:', correctWords);
    
  }, [originalMnemonic, shuffledWords]);

  /**
   * Handle word selection for a specific slot
   */
  const handleWordPress = (word: string) => {
    // Find the first empty slot
    const emptySlotIndex = wordSlots.findIndex(slot => slot.selectedWord === null);
    
    if (emptySlotIndex === -1) {
      console.log('🔧 MnemonicConfirmation: All slots filled');
      return;
    }
    
    // Update the slot with selected word
    const updatedSlots = [...wordSlots];
    updatedSlots[emptySlotIndex].selectedWord = word;
    setWordSlots(updatedSlots);
    
    // Add to selected words list
    const newSelected = [...selectedWords, word];
    setSelectedWords(newSelected);
    
    console.log('🔧 MnemonicConfirmation: Word selected:', word, 'for position:', updatedSlots[emptySlotIndex].position);
  };

  /**
   * Remove word from specific slot
   */
  const handleRemoveWord = (slotIndex: number) => {
    const updatedSlots = [...wordSlots];
    const removedWord = updatedSlots[slotIndex].selectedWord;
    updatedSlots[slotIndex].selectedWord = null;
    setWordSlots(updatedSlots);
    
    // Remove from selected words
    if (removedWord) {
      const newSelected = selectedWords.filter(word => word !== removedWord);
      setSelectedWords(newSelected);
    }
    
    console.log('🔧 MnemonicConfirmation: Word removed from position:', updatedSlots[slotIndex].position);
  };

  /**
   * Verify confirmation
   */
  const handleConfirm = () => {
    console.log('🔧 MnemonicConfirmation: Verifying 3-word confirmation...');
    
    const isCorrect = wordSlots.every(slot => slot.selectedWord === slot.correctWord);
    
    if (isCorrect) {
      console.log('✅ MnemonicConfirmation: 3-word verification successful');
      onConfirm(originalWords); // Pass full mnemonic as user has verified they have it
    } else {
      console.log('❌ MnemonicConfirmation: 3-word verification failed');
      Alert.alert(
        'Incorrect Words',
        'Some words are incorrect. Please check your recovery phrase and try again.',
        [{ text: 'Try Again', onPress: handleClearAll }]
      );
    }
  };

  /**
   * Clear all selections
   */
  const handleClearAll = () => {
    const clearedSlots = wordSlots.map(slot => ({
      ...slot,
      selectedWord: null,
    }));
    setWordSlots(clearedSlots);
    setSelectedWords([]);
    console.log('🔧 MnemonicConfirmation: All selections cleared');
  };

  const filledSlots = wordSlots.filter(slot => slot.selectedWord !== null).length;
  const isComplete = filledSlots === 3;

  return (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContentContainer}
    >
      <Text style={styles.title}>Verify Your Recovery Phrase</Text>
      <Text style={styles.subtitle}>
        Select the correct words for the highlighted positions
      </Text>

      {/* Progress indicator */}
      <Text style={styles.progressText}>
        {filledSlots} of 3 words selected
      </Text>

      {/* Word slots */}
      <View style={styles.slotsContainer}>
        {wordSlots.map((slot, index) => (
          <View key={index} style={styles.slotRow}>
            <Text style={styles.slotLabel}>Word #{slot.position}</Text>
            <TouchableOpacity
              style={[
                styles.slotButton,
                slot.selectedWord && styles.slotButtonFilled
              ]}
              onPress={() => handleRemoveWord(index)}
              disabled={!slot.selectedWord}
            >
              {slot.selectedWord ? (
                <View style={styles.slotContent}>
                  <Text style={styles.slotText}>{slot.selectedWord}</Text>
                  <Text style={styles.removeIcon}>×</Text>
                </View>
              ) : (
                <Text style={styles.slotPlaceholder}>Tap to select</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Word choices */}
      <Text style={styles.choicesLabel}>Choose from these words:</Text>
      <View style={styles.wordChoicesContainer}>
        {availableWords.map((word, index) => {
          const isUsed = selectedWords.includes(word);
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.wordChoice,
                isUsed && styles.wordChoiceUsed
              ]}
              onPress={() => handleWordPress(word)}
              disabled={isUsed || filledSlots >= 3}
            >
              <Text style={[
                styles.wordChoiceText,
                isUsed && styles.wordChoiceTextUsed
              ]}>
                {word}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        {filledSlots > 0 && (
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={handleClearAll}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}

        {isComplete && (
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleConfirm}
          >
            <Text style={styles.primaryButtonText}>Verify & Continue</Text>
          </TouchableOpacity>
        )}
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
    marginBottom: 16,
    lineHeight: 24,
  },
  progressText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  slotsContainer: {
    marginBottom: 32,
  },
  slotRow: {
    marginBottom: 16,
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  slotButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    minHeight: 56,
    justifyContent: 'center',
  },
  slotButtonFilled: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  slotContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  removeIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  slotPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  choicesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  wordChoicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  wordChoice: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 4,
  },
  wordChoiceUsed: {
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },
  wordChoiceText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '500',
  },
  wordChoiceTextUsed: {
    color: '#9CA3AF',
  },
  buttonContainer: {
    gap: 16,
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DC2626',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#DC2626',
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