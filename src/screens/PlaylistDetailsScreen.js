import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useAudio } from '../context/AudioContext';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MiniPlayer from '../components/player/MiniPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 360;
const ALBUM_SIZE = 220;

const PlaylistDetailsScreen = ({ route, navigation }) => {
  const { playlist } = route.params;
  const { playTrack, currentTrack, isPlaying } = useAudio();
  const insets = useSafeAreaInsets();
  const [isFavorite, setIsFavorite] = useState(false);

  // Animation setup
  const scrollY = useRef(new Animated.Value(0)).current;

  // Header animations
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - 90],
    outputRange: [0, -(HEADER_HEIGHT - 90 - insets.top)],
    extrapolate: 'clamp',
  });

  // Album animations
  const albumOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - 120],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const albumScale = scrollY.interpolate({
    inputRange: [-100, 0, HEADER_HEIGHT - 120],
    outputRange: [1.1, 1, 0.5],
    extrapolate: 'clamp',
  });

  const albumTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - 120],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  // Info animations
  const headerInfoOpacity = scrollY.interpolate({
    inputRange: [HEADER_HEIGHT - 220, HEADER_HEIGHT - 120],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Title in header animation
  const titleOpacity = scrollY.interpolate({
    inputRange: [HEADER_HEIGHT - 150, HEADER_HEIGHT - 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Action buttons animation
  const actionButtonsTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  // Helper functions
  const handlePlayTrack = (track, index) => {
    playTrack(track, playlist.tracks, index);
  };

  const playAllTracks = () => {
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks, 0);
    }
  };

  const shuffleAndPlay = () => {
    if (playlist.tracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * playlist.tracks.length);
      playTrack(playlist.tracks[randomIndex], playlist.tracks, randomIndex);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // Add animation here
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animated values for interactive elements
  const heartScale = useRef(new Animated.Value(1)).current;

  // Find playlist cover image
  const findPlaylistCover = () => {
    if (playlist.tracks.length > 0) {
      const trackWithArt = playlist.tracks.find(track => track.artwork);
      if (trackWithArt) {
        // Handle different artwork formats
        if (typeof trackWithArt.artwork === 'string') {
          return { uri: trackWithArt.artwork };
        } else if (trackWithArt.artwork && trackWithArt.artwork.uri) {
          return { uri: trackWithArt.artwork.uri };
        } else {
          return trackWithArt.artwork;
        }
      }
    }
    return null;
  };

  const playlistCover = findPlaylistCover();

  // Get gradient colors
  const getGradientColors = () => {
    return ['#1E3264', '#764BA2', '#667EEA'];
  };

  // Track item component
  const renderTrackItem = ({ item, index }) => {
    const isCurrentlyPlaying = currentTrack && currentTrack.id === item.id;
    let artworkSource = null;

    if (item.artwork) {
      // Handle different artwork formats
      if (typeof item.artwork === 'string') {
        artworkSource = { uri: item.artwork };
      } else if (item.artwork && item.artwork.uri) {
        artworkSource = { uri: item.artwork.uri };
      } else {
        artworkSource = item.artwork;
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.trackItem,
          isCurrentlyPlaying && styles.currentTrack,
        ]}
        onPress={() => handlePlayTrack(item, index)}
        activeOpacity={0.7}
      >
        {isCurrentlyPlaying && (
          <View style={styles.playingIndicator}>
            <LinearGradient
              colors={['#FF7EB3', '#FF758C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.playingIndicatorLine}
            />
          </View>
        )}

        <View style={styles.trackIndexContainer}>
          {isCurrentlyPlaying ? (
            <Animated.View style={styles.equalizer}>
              <LinearGradient
                colors={['#FF7EB3', '#FF758C']}
                // eslint-disable-next-line react-native/no-inline-styles
                style={[styles.equalizerBar1, { height: isPlaying ? 12 : 6 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <LinearGradient
                colors={['#FF7EB3', '#FF758C']}
                // eslint-disable-next-line react-native/no-inline-styles
                style={[styles.equalizerBar2, { height: isPlaying ? 18 : 10 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <LinearGradient
                colors={['#FF7EB3', '#FF758C']}
                // eslint-disable-next-line react-native/no-inline-styles
                style={[styles.equalizerBar3, { height: isPlaying ? 8 : 4 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            </Animated.View>
          ) : (
            <Text style={styles.trackIndex}>{index + 1}</Text>
          )}
        </View>

        <View style={styles.albumArt}>
          {artworkSource ? (
            <Image
              source={artworkSource}
              style={styles.albumImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={getGradientColors()}
              style={styles.placeholderImage}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.placeholderText}>{item.title[0]}</Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.trackInfo}>
          <Text
            style={[
              styles.trackTitle,
              isCurrentlyPlaying && styles.currentTrackText,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
        </View>

        <TouchableOpacity style={styles.menuButton}>
          <MaterialIcons name="more-horiz" size={24} color="#aaa" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Empty state component
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={['rgba(255,126,179,0.2)', 'rgba(103,126,234,0.2)']}
          style={styles.emptyIconBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="musical-notes" size={40} color="#bbb" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyStateText}>This playlist is empty</Text>
      <Text style={styles.emptyStateSubtext}>
        Add tracks from your library or browse music to fill this playlist
      </Text>
      <TouchableOpacity
        style={styles.addTracksButton}
        onPress={() => {
          // Add animation on press
          Animated.sequence([
            Animated.timing(addButtonScale, {
              toValue: 0.95,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(addButtonScale, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]).start();
        }}
      >
        <Text style={styles.addTracksButtonText}>Add Tracks</Text>
      </TouchableOpacity>
    </View>
  );

  // Animated value for empty state button
  const addButtonScale = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />

      {/* Animated Header */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerTranslateY }],
            paddingTop: insets.top,
          },
        ]}
      >
        <LinearGradient
          colors={getGradientColors()}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Back and menu buttons */}
        <View style={[styles.headerNav, { marginTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Try to go back, but if that fails, navigate to the main screen
              try {
                navigation.goBack();
              } catch (err) {
                navigation.navigate('Main');
              }
            }}
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Animated.View style={{ opacity: titleOpacity }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {playlist.name}
            </Text>
          </Animated.View>

          <TouchableOpacity style={styles.menuButton}>
            <Feather name="more-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Playlist Cover */}
        <Animated.View
          style={[
            styles.coverArtContainer,
            {
              opacity: albumOpacity,
              transform: [
                { scale: albumScale },
                { translateY: albumTranslateY },
              ],
            },
          ]}
        >
          {playlistCover ? (
            <Image
              source={playlistCover}
              style={styles.coverArt}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={getGradientColors()}
              style={styles.coverArt}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="musical-notes" size={80} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}

          <View style={styles.albumShadow} />
        </Animated.View>

        {/* Playlist Info */}
        <Animated.View
          style={[
            styles.playlistInfo,
            { opacity: headerInfoOpacity },
          ]}
        >
          <Text style={styles.playlistName} numberOfLines={2}>{playlist.name}</Text>
          <Text style={styles.playlistDetails}>
            {playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'} • Created by You
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Action buttons */}
      <Animated.View
        style={[
          styles.actionButtonsContainer,
          {
            marginTop: HEADER_HEIGHT + 4,
            transform: [{ translateY: actionButtonsTranslateY }],
          },
        ]}
      >
        <View style={styles.actionButtons}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? '#FF5C8D' : '#bbb'}
              />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            onPress={shuffleAndPlay}
            style={styles.shuffleButton}
            activeOpacity={0.8}
          >
            <Ionicons name="shuffle" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playAllButton}
            onPress={playAllTracks}
            disabled={playlist.tracks.length === 0}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF7EB3', '#FF758C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.playAllGradient}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.playAllText}>Play All</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Track List */}
      {playlist.tracks.length === 0 ? (
        renderEmptyState()
      ) : (
        <Animated.FlatList
          data={playlist.tracks}
          renderItem={renderTrackItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.trackList,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      )}

      {/* Mini Player */}
      <MiniPlayer onPress={() => navigation.navigate('NowPlaying')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    overflow: 'hidden',
    zIndex: 10,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    width: SCREEN_WIDTH - 140,
    textAlign: 'center',
  },
  coverArtContainer: {
    alignSelf: 'center',
    marginTop: -50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
    zIndex: 5,
  },
  coverArt: {
    width: ALBUM_SIZE,
    height: ALBUM_SIZE,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumShadow: {
    position: 'absolute',
    bottom: -30,
    left: 20,
    right: 20,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    transform: [{ scaleX: 0.85 }],
    filter: 'blur(20px)',
    zIndex: -1,
  },
  playlistInfo: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  playlistName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  playlistDetails: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 5,
  },
  actionButtonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shuffleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playAllButton: {
    flex: 1,
    height: 40,
    marginLeft: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  playAllGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    padding: 30,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  addTracksButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
  },
  addTracksButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackList: {
    paddingTop: 16,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    marginHorizontal: 8,
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  currentTrack: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  playingIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    overflow: 'hidden',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  playingIndicatorLine: {
    width: 3,
    height: '100%',
  },
  equalizer: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  equalizerBar1: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
  },
  equalizerBar2: {
    width: 3,
    height: 18,
    borderRadius: 1.5,
  },
  equalizerBar3: {
    width: 3,
    height: 8,
    borderRadius: 1.5,
  },
  trackIndexContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackIndex: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  albumArt: {
    width: 46,
    height: 46,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 14,
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
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
    justifyContent: 'center',
  },
  trackTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  currentTrackText: {
    color: '#FF758C',
    fontWeight: 'bold',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  menuButton: {
    padding: 8,
  },
});

export default PlaylistDetailsScreen;
