import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Modal, Animated } from 'react-native';
import { useAudio } from '../../context/AudioContext';
import TrackItem from '../TrackItem';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingSpinner from '../LoadingSpinner';
import ErrorView from '../ErrorView';
import ScreenTransition from '../ScreenTransition';

// Sort options
const SORT_OPTIONS = [
  { id: 'title', label: 'Title' },
  { id: 'artist', label: 'Artist' },
  { id: 'album', label: 'Album' },
  { id: 'duration', label: 'Duration' },
];

const ITEM_HEIGHT = 72; // Height of each track item
const WINDOW_SIZE = 10; // Number of items to render at once
const MAX_TO_RENDER_PER_BATCH = 5; // Number of items to render in each batch

const SongsTab = ({ route, navigation, searchQuery }) => {
  const {
    audioFiles,
    playTrack,
    currentTrack,
    loadMoreTracks,
    isLoadingMore,
    hasMore,
  } = useAudio();
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const flatListRef = useRef(null);

  // Animation value for sort modal
  const modalAnimValue = useRef(new Animated.Value(0)).current;

  // Memoize sorted and filtered songs
  const sortedSongs = useMemo(() => {
    try {
      let filtered = [...audioFiles];

      // Apply search filter if query exists
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(song =>
          song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query) ||
          song.album.toLowerCase().includes(query)
        );
      }

      // Apply sorting
      return filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'artist':
            comparison = a.artist.localeCompare(b.artist);
            break;
          case 'album':
            comparison = a.album.localeCompare(b.album);
            break;
          case 'duration':
            comparison = a.duration - b.duration;
            break;
          default:
            comparison = 0;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    } catch (err) {
      setError('Error loading songs');
      console.error('Error in SongsTab:', err);
      return [];
    }
  }, [audioFiles, searchQuery, sortBy, sortDirection]);

  // Load saved sort preferences
  useEffect(() => {
    const loadSortPreferences = async () => {
      try {
        const savedSortBy = await AsyncStorage.getItem('songsSortBy');
        const savedSortDirection = await AsyncStorage.getItem('songsSortDirection');

        if (savedSortBy) {
          setSortBy(savedSortBy);
        }
        if (savedSortDirection) {
          setSortDirection(savedSortDirection);
        }
      } catch (err) {
        console.log('Error loading sort preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSortPreferences();
  }, []);

  // Save sort preferences when they change
  useEffect(() => {
    const saveSortPreferences = async () => {
      try {
        await AsyncStorage.setItem('songsSortBy', sortBy);
        await AsyncStorage.setItem('songsSortDirection', sortDirection);
      } catch (err) {
        console.log('Error saving sort preferences:', err);
      }
    };

    saveSortPreferences();
  }, [sortBy, sortDirection]);

  const toggleSortModal = useCallback(() => {
    setShowSortModal(prev => !prev);
    Animated.spring(modalAnimValue, {
      toValue: showSortModal ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [showSortModal, modalAnimValue]);

  const handleSortOption = useCallback((option) => {
    if (sortBy === option) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('asc');
    }
  }, [sortBy]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      loadMoreTracks();
    }
  }, [isLoadingMore, hasMore, loadMoreTracks]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) {
      return null;
    }

    return (
      <View style={styles.footer}>
        <LoadingSpinner size={24} />
      </View>
    );
  }, [isLoadingMore]);

  const renderItem = useCallback(({ item }) => (
    <TrackItem
      track={item}
      isActive={currentTrack?.id === item.id}
      onPress={() => playTrack(item)}
    />
  ), [currentTrack, playTrack]);

  const keyExtractor = useCallback((item) => item.id, []);

  const getItemLayout = useCallback((data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={60} />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorView
        message="No songs found"
        onRetry={() => {
          try {
            navigation.goBack();
          } catch (err) {
            navigation.navigate('Main');
          }
        }}
        icon="musical-notes"
        buttonText="Go Back"
      />
    );
  }

  return (
    <ScreenTransition type="fade">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={toggleSortModal}
          >
            <Ionicons name="funnel-outline" size={24} color="#FFFFFF" />
            <Text style={styles.sortButtonText}>Sort</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={sortedSongs}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          windowSize={WINDOW_SIZE}
          maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
          removeClippedSubviews={true}
          initialNumToRender={10}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />

        <Modal
          visible={showSortModal}
          transparent
          animationType="none"
          onRequestClose={toggleSortModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={toggleSortModal}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{
                    translateY: modalAnimValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  }],
                },
              ]}
            >
              <LinearGradient
                colors={['#1E3264', '#764BA2', '#667EEA']}
                style={styles.modalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sort By</Text>
                  <TouchableOpacity onPress={toggleSortModal}>
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.sortOption}
                    onPress={() => handleSortOption(option.id)}
                  >
                    <Text style={styles.sortOptionText}>{option.label}</Text>
                    {sortBy === option.id && (
                      <Ionicons
                        name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                        size={20}
                        color="#FF4893"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </View>
    </ScreenTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sortButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sortOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default SongsTab;
