import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, Image, Dimensions } from 'react-native';
import { useAudio } from '../../context/AudioContext';

import LoadingSpinner from '../LoadingSpinner';
import ErrorView from '../ErrorView';
import ScreenTransition from '../ScreenTransition';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / NUM_COLUMNS; // 48 = padding (16) * 3
const ITEM_HEIGHT = ITEM_WIDTH + 60; // Extra space for title and artist
const WINDOW_SIZE = 6; // Number of items to render at once
const MAX_TO_RENDER_PER_BATCH = 4;

const AlbumsTab = ({ navigation, searchQuery }) => {
  const { audioFiles } = useAudio();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const flatListRef = useRef(null);
  const [layoutMode ] = useState('grid'); // 'grid' or 'list'

  // Memoize grouped albums
  const groupedAlbums = useMemo(() => {
    try {
      const albums = {};

      audioFiles.forEach(song => {
        if (!albums[song.album]) {
          albums[song.album] = {
            title: song.album,
            artist: song.artist,
            cover: song.cover,
            songs: [],
          };
        }
        albums[song.album].songs.push(song);
      });

      // Filter albums based on search query
      let filteredAlbums = Object.values(albums);
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredAlbums = filteredAlbums.filter(album =>
          album.title.toLowerCase().includes(query) ||
          album.artist.toLowerCase().includes(query)
        );
      }

      return filteredAlbums.sort((a, b) => a.title.localeCompare(b.title));
    } catch (err) {
      setError('Error loading albums');
      console.error('Error in AlbumsTab:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [audioFiles, searchQuery]);

  const renderItem = useCallback(({ item, index }) => {
    const isEven = index % 2 === 0;
    const marginLeft = isEven ? 0 : 16;
    const marginRight = isEven ? 16 : 0;

    return (
      <TouchableOpacity
        style={[
          styles.albumItem,
          layoutMode === 'grid' && {
            width: ITEM_WIDTH,
            marginLeft,
            marginRight,
          },
        ]}
        onPress={() => navigation.navigate('AlbumDetails', { album: item })}
      >
        <View style={styles.albumArtContainer}>
          {item.cover ? (
            <Image
              source={{ uri: item.cover }}
              style={styles.albumArt}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.albumArt, styles.placeholderArt]}>
              <Text style={styles.placeholderText}>
                {item.title.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.albumInfo}>
          <Text style={styles.albumTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {item.artist}
          </Text>
          <Text style={styles.trackCount}>
            {item.songs.length} {item.songs.length === 1 ? 'track' : 'tracks'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [layoutMode, navigation]);

  const keyExtractor = useCallback((item) => item.title, []);

  const getItemLayout = useCallback((data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * Math.floor(index / NUM_COLUMNS),
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
        message="No albums found"
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
        <FlatList
          ref={flatListRef}
          data={groupedAlbums}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          numColumns={layoutMode === 'grid' ? NUM_COLUMNS : 1}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          windowSize={WINDOW_SIZE}
          maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
          removeClippedSubviews={true}
          initialNumToRender={10}
          onEndReachedThreshold={0.5}
          key={layoutMode} // Force re-render when layout changes
        />
      </View>
    </ScreenTransition>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  listContent: {
    padding: 16,
  },
  albumItem: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  albumArtContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  placeholderArt: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  placeholderText: {
    fontSize: 32,
    color: '#fff',
    opacity: 0.5,
  },
  albumInfo: {
    padding: 8,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  artistName: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  trackCount: {
    fontSize: 10,
    color: '#666',
  },
});

export default AlbumsTab;

