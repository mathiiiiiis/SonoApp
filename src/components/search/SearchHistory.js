import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_HISTORY_ITEMS = 5;

const SearchHistory = ({ onSelectSearch, onClearHistory }) => {
  const [searchHistory, setSearchHistory] = useState([]);

  // Load search history from AsyncStorage
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await AsyncStorage.getItem('searchHistory');
        if (history) {
          setSearchHistory(JSON.parse(history));
        }
      } catch (error) {
        console.log('Error loading search history:', error);
      }
    };

    loadSearchHistory();
  }, []);

  // Save search history to AsyncStorage
  useEffect(() => {
    const saveSearchHistory = async () => {
      try {
        await AsyncStorage.setItem('searchHistory', JSON.stringify(searchHistory));
      } catch (error) {
        console.log('Error saving search history:', error);
      }
    };

    if (searchHistory.length > 0) {
      saveSearchHistory();
    }
  }, [searchHistory]);

  const handleSelectSearch = (term) => {
    onSelectSearch(term);
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    onClearHistory();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => handleSelectSearch(item)}
    >
      <Ionicons name="time-outline" size={18} color="#999" style={styles.historyIcon} />
      <Text style={styles.historyText}>{item}</Text>
    </TouchableOpacity>
  );

  if (searchHistory.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Searches</Text>
        <TouchableOpacity onPress={handleClearHistory}>
          <Text style={styles.clearButton}>Clear</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={searchHistory}
        renderItem={renderItem}
        keyExtractor={(item, index) => `history-${index}`}
        scrollEnabled={false}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  title: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    color: '#FF4893',
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    maxHeight: 200,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  historyIcon: {
    marginRight: 12,
  },
  historyText: {
    color: '#fff',
    fontSize: 15,
  },
});

export default SearchHistory;

// Helper function to add a search term to history
export const addToSearchHistory = async (term) => {
  if (!term || term.trim() === '') {
    return;
  }
  try {
    const history = await AsyncStorage.getItem('searchHistory');
    let searchHistory = history ? JSON.parse(history) : [];

    // Remove the term if it already exists
    searchHistory = searchHistory.filter(item => item !== term);

    // Add the term to the beginning of the array
    searchHistory.unshift(term);

    // Limit the number of items
    if (searchHistory.length > MAX_HISTORY_ITEMS) {
      searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
    }

    await AsyncStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  } catch (error) {
    console.log('Error adding to search history:', error);
  }
};
