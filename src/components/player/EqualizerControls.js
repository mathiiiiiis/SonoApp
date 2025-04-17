import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { AudioContext } from '../context/AudioContext';
import { EQUALIZER_BANDS, EQUALIZER_PRESETS } from '../utils/equalizer';

const EqualizerControls = () => {
  const audioContext = useContext(AudioContext);

  // Default values if context is not available
  const equalizerEnabled = audioContext?.equalizerEnabled || false;
  const equalizerBands = audioContext?.equalizerBands || EQUALIZER_BANDS;
  const selectedPreset = audioContext?.selectedPreset || 'flat';

  // Safe function calls with fallbacks
  const toggleEqualizer = audioContext?.toggleEqualizer || (() => console.log('toggleEqualizer not available'));
  const updateEqualizerBand = audioContext?.updateEqualizerBand || ((index, gain) => console.log('updateEqualizerBand not available', index, gain));
  const applyEqualizerPreset = audioContext?.applyEqualizerPreset || ((preset) => console.log('applyEqualizerPreset not available', preset));
  const resetEqualizer = audioContext?.resetEqualizer || (() => console.log('resetEqualizer not available'));

  const formatFrequency = (freq) => {
    if (freq >= 1000) {
      return `${freq / 1000}kHz`;
    }
    return `${freq}Hz`;
  };

  const formatGain = (gain) => {
    return gain > 0 ? `+${gain}dB` : `${gain}dB`;
  };

  if (!audioContext) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Audio context not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Equalizer</Text>
        <TouchableOpacity
          style={[styles.toggleButton, equalizerEnabled && styles.toggleButtonActive]}
          onPress={toggleEqualizer}
        >
          <Text style={[styles.toggleButtonText, equalizerEnabled && styles.toggleButtonTextActive]}>
            {equalizerEnabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.presetsContainer}
      >
        {Object.keys(EQUALIZER_PRESETS).map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              selectedPreset === preset && styles.presetButtonActive,
            ]}
            onPress={() => applyEqualizerPreset(preset)}
          >
            <Text
              style={[
                styles.presetButtonText,
                selectedPreset === preset && styles.presetButtonTextActive,
              ]}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.bandsContainer}>
        {equalizerBands.map((band, index) => (
          <View key={band.frequency} style={styles.bandContainer}>
            <Text style={styles.gainText}>{formatGain(band.gain)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={-12}
              maximumValue={12}
              step={1}
              value={band.gain}
              onValueChange={(value) => updateEqualizerBand(index, value)}
              minimumTrackTintColor="#FF4893"
              maximumTrackTintColor="#3e3e3e"
              thumbTintColor="#ffffff"
            />
            <Text style={styles.frequencyText}>{formatFrequency(band.frequency)}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={resetEqualizer}>
        <Text style={styles.resetButtonText}>Reset to Flat</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FF4893',
    fontSize: 16,
    textAlign: 'center',
    padding: 16,
  },
  toggleButton: {
    backgroundColor: '#3e3e3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#FF4893',
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  presetsContainer: {
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: '#3e3e3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  presetButtonActive: {
    backgroundColor: '#FF4893',
  },
  presetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bandsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 200,
    marginBottom: 16,
  },
  bandContainer: {
    alignItems: 'center',
    flex: 1,
  },
  gainText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 8,
  },
  slider: {
    width: 40,
    height: 150,
    transform: [{ rotate: '-90deg' }],
  },
  frequencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
  },
  resetButton: {
    backgroundColor: '#3e3e3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EqualizerControls;
