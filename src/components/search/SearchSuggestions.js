import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchSuggestions = ({ searchQuery, data, onSelectSuggestion }) => {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === '') {
      setSuggestions([]);
      return;
    }

    // Generate suggestions based on the search query
    const query = searchQuery.toLowerCase().trim();

    // Get unique suggestions from the data
    const uniqueSuggestions = new Set();

    // Add title suggestions
    data.forEach(item => {
      if (item.title && item.title.toLowerCase().includes(query)) {
        uniqueSuggestions.add(item.title);
      }

      if (item.artist && item.artist.toLowerCase().includes(query)) {
        uniqueSuggestions.add(item.artist);
      }

      if (item.album && item.album.toLowerCase().includes(query)) {
        uniqueSuggestions.add(item.album);
      }
    });

    // Convert to array and limit to 5 suggestions
    const suggestionArray = Array.from(uniqueSuggestions).slice(0, 5);
    setSuggestions(suggestionArray);
  }, [searchQuery, data]);

  const handleSelectSuggestion = (suggestion) => {
    onSelectSuggestion(suggestion);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectSuggestion(item)}
    >
      <Ionicons name="search-outline" size={18} color="#999" style={styles.suggestionIcon} />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={suggestions}
        renderItem={renderItem}
        keyExtractor={(item, index) => `suggestion-${index}`}
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
  list: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 15,
  },
});

export default SearchSuggestions;
