import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchHistory from './SearchHistory';
import SearchSuggestions from './SearchSuggestions';
import { addToSearchHistory } from './SearchHistory';

const SearchBar = ({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search...',
  data = [],
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const inputRef = useRef(null);

  // Animation value for focus effect
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate the focus effect
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnim]);

  const handleFocus = () => {
    setIsFocused(true);
    setShowHistory(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding history to allow for taps
    setTimeout(() => {
      if (!inputRef.current?.isFocused()) {
        setShowHistory(false);
      }
    }, 200);
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (value.trim()) {
      addToSearchHistory(value.trim());
      onSubmit(value.trim());
      setShowHistory(false);
    }
  };

  const handleSelectHistory = (term) => {
    onChangeText(term);
    onSubmit(term);
    setShowHistory(false);
  };

  const handleSelectSuggestion = (suggestion) => {
    onChangeText(suggestion);
    onSubmit(suggestion);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    setShowHistory(false);
  };

  // Interpolate border color based on focus state
  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.1)', '#FF4893'],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.inputContainer,
          { borderColor },
        ]}
      >
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      {isFocused && showHistory && (
        <View style={styles.suggestionsContainer}>
          {value ? (
            <SearchSuggestions
              searchQuery={value}
              data={data}
              onSelectSuggestion={handleSelectSuggestion}
            />
          ) : (
            <SearchHistory
              onSelectSearch={handleSelectHistory}
              onClearHistory={handleClearHistory}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default SearchBar;
