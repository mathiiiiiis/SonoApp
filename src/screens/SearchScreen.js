import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  StatusBar,
} from 'react-native';
import { useAudio } from '../context/AudioContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SearchScreen = ({ navigation }) => {
  const { audioFiles, playlists, albums, playTrack, currentTrack } = useAudio();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'songs', 'albums', 'playlists'
  const insets = useSafeAreaInsets();

  // Animation values
  const inputAnimValue = React.useRef(new Animated.Value(0)).current;
  const resultsAnimValue = React.useRef(new Animated.Value(0)).current;

  // Function to animate search input
  const animateSearchInput = (isFocused) => {
    setIsSearching(isFocused);
    Animated.timing(inputAnimValue, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Load recent searches from storage
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const savedSearches = await AsyncStorage.getItem('recentSearches');
        if (savedSearches) {
          setRecentSearches(JSON.parse(savedSearches));
        }
      } catch (error) {
        console.log('Error loading recent searches:', error);
      }
    };
    loadRecentSearches();
  }, []);

  // Save recent searches to storage
  const saveRecentSearches = async (searches) => {
    try {
      await AsyncStorage.setItem('recentSearches', JSON.stringify(searches));
    } catch (error) {
      console.log('Error saving recent searches:', error);
    }
  };

  // Generate search suggestions
  const generateSuggestions = (query) => {
    if (!query || query.length < 2) {
      return [];
    }

    const suggestions = new Set();
    const lowercaseQuery = query.toLowerCase();

    // Add matching song titles
    audioFiles.forEach(track => {
      if (track.title.toLowerCase().includes(lowercaseQuery)) {
        suggestions.add(track.title);
      }
      if (track.artist.toLowerCase().includes(lowercaseQuery)) {
        suggestions.add(track.artist);
      }
    });

    // Add matching album names
    Object.keys(albums).forEach(albumName => {
      if (albumName.toLowerCase().includes(lowercaseQuery)) {
        suggestions.add(albumName);
      }
    });

    // Add matching playlist names
    playlists.forEach(playlist => {
      if (playlist.name.toLowerCase().includes(lowercaseQuery)) {
        suggestions.add(playlist.name);
      }
    });

    return Array.from(suggestions).slice(0, 5);
  };

  // Handle search with category filtering
  const handleSearch = (text) => {
    setSearchQuery(text);

    if (text.trim() === '') {
      setSearchResults([]);
      setSearchSuggestions([]);
      return;
    }

    const query = text.toLowerCase();
    let results = [];

    // Generate suggestions
    setSearchSuggestions(generateSuggestions(text));

    // Filter based on active category
    switch (activeCategory) {
      case 'songs':
        results = audioFiles.filter(track =>
          track.title.toLowerCase().includes(query) ||
          track.artist.toLowerCase().includes(query)
        );
        break;
      case 'albums':
        results = Object.entries(albums)
          .filter(([albumName]) => albumName.toLowerCase().includes(query))
          .map(([albumName, tracks]) => ({
            id: albumName,
            type: 'album',
            name: albumName,
            artist: tracks[0]?.artist || 'Unknown Artist',
            trackCount: tracks.length,
            artwork: tracks[0]?.artwork,
          }));
        break;
      case 'playlists':
        results = playlists
          .filter(playlist => playlist.name.toLowerCase().includes(query))
          .map(playlist => ({
            id: playlist.id,
            type: 'playlist',
            name: playlist.name,
            trackCount: playlist.tracks.length,
          }));
        break;
      default: // 'all'
        results = [
          ...audioFiles.filter(track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query)
          ).map(track => ({ ...track, type: 'song' })),
          ...Object.entries(albums)
            .filter(([albumName]) => albumName.toLowerCase().includes(query))
            .map(([albumName, tracks]) => ({
              id: albumName,
              type: 'album',
              name: albumName,
              artist: tracks[0]?.artist || 'Unknown Artist',
              trackCount: tracks.length,
              artwork: tracks[0]?.artwork,
            })),
          ...playlists
            .filter(playlist => playlist.name.toLowerCase().includes(query))
            .map(playlist => ({
              id: playlist.id,
              type: 'playlist',
              name: playlist.name,
              trackCount: playlist.tracks.length,
            })),
        ];
    }

    setSearchResults(results);

    // Add to recent searches
    if (text.trim() !== '') {
      clearTimeout(searchDebounce.current);
      searchDebounce.current = setTimeout(() => {
        const newRecentSearches = [text.trim(), ...recentSearches.filter(s => s !== text.trim())].slice(0, 10);
        setRecentSearches(newRecentSearches);
        saveRecentSearches(newRecentSearches);
      }, 1000);
    }
  };

  // Debounce for adding to recent searches
  const searchDebounce = React.useRef(null);

  const handlePlayTrack = (track, index) => {
    playTrack(track, searchResults, index);
    navigation.navigate('Now Playing');
  };

  const renderSearchSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSearch(item)}
    >
      <Ionicons name="search-outline" size={20} color="#aaa" style={styles.suggestionIcon} />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => {
    switch (item.type) {
      case 'song':
        return (
          <TouchableOpacity
            style={styles.trackItem}
            onPress={() => handlePlayTrack(item, searchResults.indexOf(item))}
            activeOpacity={0.7}
          >
            <View style={styles.albumArt}>
              {item.artwork ? (
                <Image source={{ uri: item.artwork }} style={styles.albumImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>{item.title[0]}</Text>
                </View>
              )}
            </View>
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
            </View>
            <TouchableOpacity style={styles.trackOptionsButton}>
              <Feather name="more-vertical" size={20} color="#aaa" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      case 'album':
        return (
          <TouchableOpacity
            style={styles.trackItem}
            onPress={() => navigation.navigate('AlbumDetails', { albumName: item.name })}
            activeOpacity={0.7}
          >
            <View style={styles.albumArt}>
              {item.artwork ? (
                <Image source={{ uri: item.artwork }} style={styles.albumImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>{item.name[0]}</Text>
                </View>
              )}
            </View>
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {item.artist} • {item.trackCount} tracks
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#aaa" />
          </TouchableOpacity>
        );
      case 'playlist':
        return (
          <TouchableOpacity
            style={styles.trackItem}
            onPress={() => navigation.navigate('PlaylistDetails', { playlistId: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.albumArt}>
              <View style={styles.placeholderImage}>
                <Ionicons name="list" size={24} color="#fff" />
              </View>
            </View>
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {item.trackCount} tracks
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#aaa" />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const renderRecentSearchItem = ({ item }) => (
    <TouchableOpacity
      style={styles.recentSearchItem}
      onPress={() => handleSearch(item)}
    >
      <Ionicons name="time-outline" size={20} color="#aaa" style={styles.recentSearchIcon} />
      <Text style={styles.recentSearchText}>{item}</Text>
      <TouchableOpacity
        style={styles.recentSearchRemove}
        onPress={() => setRecentSearches(prev => prev.filter(search => search !== item))}
      >
        <Ionicons name="close" size={18} color="#aaa" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const inputWidth = inputAnimValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['100%', '85%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#373737', '#121212']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.searchWrapper}>
          <Animated.View style={[styles.searchContainer, { width: inputWidth }]}>
            <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search songs, artists, albums..."
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => animateSearchInput(true)}
              onBlur={() => animateSearchInput(false)}
              selectionColor="#FF4893"
            />
            {searchQuery ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => handleSearch('')}
              >
                <Ionicons name="close-circle" size={20} color="#aaa" />
              </TouchableOpacity>
            ) : null}
          </Animated.View>

          {isSearching && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                handleSearch('');
                animateSearchInput(false);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {isSearching && (
          <View style={styles.categoryTabs}>
            {['all', 'songs', 'albums', 'playlists'].map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  activeCategory === category && styles.activeCategoryTab,
                ]}
                onPress={() => setActiveCategory(category)}
              >
                <Text style={[
                  styles.categoryText,
                  activeCategory === category && styles.activeCategoryText,
                ]}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>

      {!isSearching ? (
        <View style={styles.recentSearchesContainer}>
          <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
          {recentSearches.length > 0 ? (
            <FlatList
              data={recentSearches}
              renderItem={renderRecentSearchItem}
              keyExtractor={item => item}
              contentContainerStyle={styles.recentSearchesList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={64} color="#555" />
              <Text style={styles.emptyStateText}>Search for your favorite music</Text>
            </View>
          )}
        </View>
      ) : searchQuery.trim() === '' ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#555" />
          <Text style={styles.emptyStateText}>Search for your favorite music</Text>
        </View>
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="sad" size={64} color="#555" />
          <Text style={styles.emptyStateText}>No results found for "{searchQuery}"</Text>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.resultsContainer,
            {
              opacity: resultsAnimValue,
              transform: [
                {
                  translateY: resultsAnimValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {searchSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              <FlatList
                data={searchSuggestions}
                renderItem={renderSearchSuggestion}
                keyExtractor={item => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsList}
              />
            </View>
          )}

          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}

      {currentTrack && (
        <TouchableOpacity
          style={styles.miniPlayer}
          onPress={() => navigation.navigate('Now Playing')}
        >
          <Image
            source={{ uri: currentTrack.artwork }}
            style={styles.miniPlayerArtwork}
          />
          <View style={styles.miniPlayerInfo}>
            <Text style={styles.miniPlayerTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.miniPlayerArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <TouchableOpacity style={styles.miniPlayerPlayButton}>
            <Ionicons name="play" size={24} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  cancelButton: {
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#FF4893',
    fontSize: 16,
    fontWeight: '600',
  },
  recentSearchesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  recentSearchesTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  recentSearchesList: {
    paddingBottom: 24,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  recentSearchIcon: {
    marginRight: 12,
  },
  recentSearchText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  recentSearchRemove: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  trackOptionsButton: {
    padding: 8,
  },
  miniPlayer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
  },
  miniPlayerBlur: {
    flex: 1,
  },
  miniPlayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  miniAlbumArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  miniAlbumImage: {
    width: '100%',
    height: '100%',
  },
  miniAlbumPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAlbumPlaceholderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  miniTrackInfo: {
    flex: 1,
  },
  miniTrackTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  miniTrackArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  miniPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  activeCategoryTab: {
    backgroundColor: '#FF4893',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: '600',
  },
  suggestionsContainer: {
    padding: 16,
  },
  suggestionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionsList: {
    paddingRight: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  suggestionIcon: {
    marginRight: 8,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
  },
  miniPlayerArtwork: {
    width: '100%',
    height: '100%',
  },
  miniPlayerInfo: {
    flex: 1,
  },
  miniPlayerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  miniPlayerArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  miniPlayerPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchScreen;
