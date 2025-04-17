import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useAudio } from '../context/AudioContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorView from '../components/common/ErrorView';
import ScreenTransition from '../components/common/ScreenTransition';
import DefaultAlbumArt from '../components/album/DefaultAlbumArt';

const { width } = Dimensions.get('window');

// Helper function to format track duration
const formatDuration = (durationInMillis) => {
  if (!durationInMillis) {
    return '--:--';
  }
  const totalSeconds = Math.floor(durationInMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// Memoized track item component for better performance
const TrackItem = React.memo(({ item, index, album, currentTrack, isPlaying, onPress }) => (
  <TouchableOpacity
    style={[
      styles.trackItem,
      currentTrack?.id === item.id && styles.currentTrackItem,
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.trackNumber,
      currentTrack?.id === item.id && styles.currentTrackText,
    ]}>
      {index + 1}
    </Text>
    <View style={styles.trackInfo}>
      <Text
        style={[
          styles.trackTitle,
          currentTrack?.id === item.id && styles.currentTrackText,
        ]}
        numberOfLines={1}
      >
        {item.title}
      </Text>
      {item.artist && item.artist !== album.artist && (
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist}
        </Text>
      )}
    </View>
    <Text style={styles.trackDuration}>
      {formatDuration(item.duration)}
    </Text>
    {currentTrack?.id === item.id && (
      <View style={styles.nowPlayingIndicator}>
        {isPlaying ? (
          <Ionicons name="musical-note" size={18} color="#FF4893" />
        ) : (
          <Ionicons name="pause" size={18} color="#FF4893" />
        )}
      </View>
    )}
  </TouchableOpacity>
));

const AlbumDetailsScreen = ({ route, navigation }) => {
  const { albumName } = route.params;
  const insets = useSafeAreaInsets();
  const {
    getAlbumByName,
    playAlbum,
    shuffleAlbum,
    currentTrack,
    isPlaying,
  } = useAudio();

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dominantColor] = useState('#1E3264');

  useEffect(() => {
    const loadAlbum = async () => {
      try {
        setLoading(true);
        setError(null);
        const albumData = getAlbumByName(albumName);
        if (!albumData) {
          throw new Error('Album not found');
        }
        setAlbum(albumData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAlbum();
  }, [albumName, getAlbumByName]);

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
        message={error}
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
    <ScreenTransition type="both">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        <LinearGradient
          colors={[dominantColor, '#121212', '#121212']}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              try {
                navigation.goBack();
              } catch (err) {
                navigation.navigate('Main');
              }
            }}
            hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
          >
            <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.albumInfo}>
            {album.artwork ? (
              <Image
                source={{ uri: album.artwork }}
                style={styles.albumArt}
                resizeMode="cover"
              />
            ) : (
              <DefaultAlbumArt
                size={width * 0.35}
                title={album.name}
                style={styles.albumArt}
              />
            )}
            <View style={styles.albumDetails}>
              <Text style={styles.albumName} numberOfLines={2} ellipsizeMode="tail">
                {album.name}
              </Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {album.artist}
              </Text>
              <Text style={styles.trackCount}>
                {album.tracks.length} {album.tracks.length === 1 ? 'track' : 'tracks'} • {album.year || 'Unknown year'}
              </Text>
            </View>
          </View>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => playAlbum(album.name)}
            >
              <LinearGradient
                colors={['#FF4893', '#9F2BC1']}
                style={styles.playButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="play" size={24} color="#FFFFFF" />
                <Text style={styles.playButtonText}>Play</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shuffleButton}
              onPress={() => shuffleAlbum(album.name)}
            >
              <Ionicons name="shuffle" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <FlatList
          data={album.tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackItem
              item={item}
              index={index}
              album={album}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onPress={() => playAlbum(album.name, index)}
            />
          )}
          contentContainerStyle={styles.trackList}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          updateCellsBatchingPeriod={50}
        />
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
    padding: 24,
    paddingBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  albumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  albumArt: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: 12,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  albumDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  albumName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  artistName: {
    color: '#DDDDDD',
    fontSize: 18,
    marginBottom: 6,
    fontWeight: '500',
  },
  trackCount: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  playButton: {
    flex: 1,
    marginRight: 16,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#FF4893',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  playButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  shuffleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  trackList: {
    padding: 16,
    paddingTop: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  currentTrackItem: {
    backgroundColor: 'rgba(255, 72, 147, 0.1)',
  },
  currentTrackText: {
    color: '#FF4893',
    fontWeight: '500',
  },
  trackNumber: {
    color: '#B3B3B3',
    fontSize: 16,
    width: 30,
    textAlign: 'center',
  },
  trackInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 4,
  },
  trackArtist: {
    color: '#B3B3B3',
    fontSize: 14,
  },
  trackDuration: {
    color: '#B3B3B3',
    fontSize: 14,
    marginRight: 8,
    width: 45,
    textAlign: 'right',
  },
  nowPlayingIndicator: {
    width: 24,
    alignItems: 'center',
  },
});

export default AlbumDetailsScreen;
