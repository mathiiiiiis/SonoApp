import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAudio } from '../context/AudioContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlbumArt from '../components/album/AlbumArt';
import MiniPlayer from '../components/player/MiniPlayer';

const HEADER_MAX_HEIGHT = 300;
const HEADER_MIN_HEIGHT = 90;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const ArtistScreen = ({ route, navigation }) => {
  const { artist } = route.params;
  const { audioFiles, playTrack, isPlaying, currentTrack, togglePlayPause } = useAudio();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  // Filter artist tracks and organize albums
  const artistTracks = audioFiles.filter(track =>
    track.artist.toLowerCase() === artist.toLowerCase()
  );

  // Create albums object
  const albumsObj = artistTracks.reduce((albums, track) => {
    const albumName = track.album || 'Unknown Album';
    if (!albums[albumName]) {
      albums[albumName] = {
        name: albumName,
        tracks: [],
        artwork: track.artwork,
        year: track.year || 'Unknown',
      };
    }
    albums[albumName].tracks.push(track);
    return albums;
  }, {});

  // Convert to array and sort by year
  const albumsArray = Object.values(albumsObj).sort((a, b) => {
    if (a.year === 'Unknown') {
      return 1;
    }
    if (b.year === 'Unknown') {
      return -1;
    }
    return b.year - a.year;
  });

  // Get artist image and colors
  const artistImage = artistTracks.length > 0 && artistTracks[0].artwork
    ? artistTracks[0].artwork
    : null;

  const artistColor = artistTracks.length > 0
    ? artistTracks[0].placeholderColor || ['#FF4893', '#121212']
    : ['#FF4893', '#121212'];

  // Animation values
  const headerY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.8],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE - 30, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Handler functions
  const handlePlayAllSongs = () => {
    if (artistTracks.length > 0) {
      playTrack(artistTracks[0], artistTracks, 0);
    }
  };

  const handleShuffleSongs = () => {
    if (artistTracks.length > 0) {
      const shuffledTracks = [...artistTracks].sort(() => Math.random() - 0.5);
      playTrack(shuffledTracks[0], shuffledTracks, 0);
    }
  };

  const handlePlayAlbum = (albumTracks) => {
    if (albumTracks.length > 0) {
      playTrack(albumTracks[0], albumTracks, 0);
    }
  };

  const handlePlayTrack = (track) => {
    const trackIndex = artistTracks.findIndex(t => t.id === track.id);
    if (trackIndex !== -1) {
      playTrack(track, artistTracks, trackIndex);
    }
  };

  const openAlbumModal = (album) => {
    setSelectedAlbum(album);
    setModalVisible(true);
  };

  const isCurrentTrackPlaying = (trackId) => {
    return currentTrack && currentTrack.id === trackId && isPlaying;
  };

  // Track item component
  // eslint-disable-next-line react/no-unstable-nested-components
  const TrackItem = ({ item, index }) => {
    const isCurrentlyPlaying = isCurrentTrackPlaying(item.id);

    return (
      <TouchableOpacity
        style={styles.trackRow}
        onPress={() => handlePlayTrack(item)}
        activeOpacity={0.7}
      >
        <View style={styles.trackLeftSection}>
          {isCurrentlyPlaying ? (
            <Ionicons name="musical-note" size={18} color="#FF4893" />
          ) : (
            <Text style={styles.trackNumber}>{index + 1}</Text>
          )}
        </View>

        <View style={styles.trackMiddleSection}>
          <Text
            style={[
              styles.trackTitle,
              isCurrentlyPlaying && styles.activeTrackText,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.trackSubtitle} numberOfLines={1}>
            {item.album || 'Unknown Album'}
          </Text>
        </View>

        <View style={styles.trackRightSection}>
          {isCurrentlyPlaying ? (
            <TouchableOpacity onPress={togglePlayPause}>
              <Ionicons name="pause" size={22} color="#FF4893" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity>
              <Ionicons name="ellipsis-vertical" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Album item component
  // eslint-disable-next-line react/no-unstable-nested-components
  const AlbumItem = ({ item }) => (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => openAlbumModal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.albumArtContainer}>
        {item.artwork ? (
          <Image
            source={{ uri: item.artwork }}
            style={styles.albumArt}
            resizeMode="cover"
          />
        ) : (
          <AlbumArt track={item.tracks[0]} size={160} textSize={36} />
        )}
        <TouchableOpacity
          style={styles.albumPlayButton}
          onPress={() => handlePlayAlbum(item.tracks)}
        >
          <Ionicons name="play-circle" size={44} color="#fff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.albumTitle} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.albumYear}>
        {item.year !== 'Unknown' ? item.year : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerY }],
            paddingTop: insets.top,
          },
        ]}
      >
        <LinearGradient
          colors={typeof artistColor === 'string' ? ['#FF4893', '#121212'] : [artistColor[0], '#121212']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          {/* Navigation Bar */}
          <View style={styles.headerNavigation}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>

            <Animated.View style={{ opacity: titleOpacity }}>
              <Text style={styles.headerTitle}>{artist}</Text>
            </Animated.View>

            <TouchableOpacity style={styles.optionsButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Artist Info */}
          <Animated.View style={[styles.artistInfoContainer, { opacity: headerOpacity }]}>
            <View style={styles.artistImageContainer}>
              {artistImage ? (
                <Image
                  source={{ uri: artistImage }}
                  style={styles.artistImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.artistImagePlaceholder}>
                  <Text style={styles.artistInitial}>{artist.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>

            <Text style={styles.artistName}>{artist}</Text>
            <Text style={styles.artistMeta}>
              {artistTracks.length} {artistTracks.length === 1 ? 'song' : 'songs'} • {albumsArray.length} {albumsArray.length === 1 ? 'album' : 'albums'}
            </Text>

            {/* Action Buttons */}
            <View style={styles.artistActions}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayAllSongs}
              >
                <LinearGradient
                  colors={['#FF4893', '#FF7676']}
                  style={styles.actionButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="play" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Play All</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shuffleButton}
                onPress={handleShuffleSongs}
              >
                <LinearGradient
                  colors={['#8C52FF', '#5CE1E6']}
                  style={styles.actionButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="shuffle" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Shuffle</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 90 + insets.bottom },
        ]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        showsVerticalScrollIndicator={false}
      >
        {/* Songs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Songs</Text>
          <View style={styles.songsContainer}>
            {artistTracks.map((track, index) => (
              <TrackItem key={track.id} item={track} index={index} />
            ))}
          </View>
        </View>

        {/* Albums Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Albums</Text>

          {/* Horizontal Albums List */}
          <FlatList
            horizontal
            data={albumsArray}
            renderItem={({ item }) => <AlbumItem item={item} />}
            keyExtractor={(item) => item.name}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumsHorizontalList}
          />
        </View>
      </Animated.ScrollView>

      {/* Mini Player */}
      <MiniPlayer onPress={() => navigation.navigate('NowPlaying')} />

      {/* Album Modal */}
      {selectedAlbum && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedAlbum.name}</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalAlbumDetails}>
                {selectedAlbum.artwork ? (
                  <Image
                    source={{ uri: selectedAlbum.artwork }}
                    style={styles.modalAlbumArt}
                  />
                ) : (
                  <AlbumArt track={selectedAlbum.tracks[0]} size={180} textSize={48} />
                )}

                <Text style={styles.modalAlbumTitle}>{selectedAlbum.name}</Text>
                <Text style={styles.modalAlbumArtist}>{artist}</Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalPlayButton}
                    onPress={() => {
                      handlePlayAlbum(selectedAlbum.tracks);
                      setModalVisible(false);
                    }}
                  >
                    <LinearGradient
                      colors={['#FF4893', '#FF7676']}
                      style={styles.modalActionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="play" size={24} color="#fff" />
                      <Text style={styles.modalActionButtonText}>Play</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalShuffleButton}
                    onPress={() => {
                      const shuffledTracks = [...selectedAlbum.tracks].sort(() => Math.random() - 0.5);
                      playTrack(shuffledTracks[0], shuffledTracks, 0);
                      setModalVisible(false);
                    }}
                  >
                    <LinearGradient
                      colors={['#8C52FF', '#5CE1E6']}
                      style={styles.modalActionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="shuffle" size={24} color="#fff" />
                      <Text style={styles.modalActionButtonText}>Shuffle</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalTrackList}>
                <Text style={styles.modalTrackListTitle}>Tracks</Text>

                {selectedAlbum.tracks.map((track, index) => (
                  <TouchableOpacity
                    key={track.id}
                    style={styles.modalTrackItem}
                    onPress={() => {
                      handlePlayTrack(track);
                      setModalVisible(false);
                    }}
                  >
                    <View style={styles.modalTrackNumberContainer}>
                      {isCurrentTrackPlaying(track.id) ? (
                        <Ionicons name="musical-note" size={18} color="#FF4893" />
                      ) : (
                        <Text style={styles.modalTrackNumber}>{index + 1}</Text>
                      )}
                    </View>

                    <View style={styles.modalTrackInfo}>
                      <Text
                        style={[
                          styles.modalTrackTitle,
                          isCurrentTrackPlaying(track.id) && styles.activeTrackText,
                        ]}
                      >
                        {track.title}
                      </Text>
                      <Text style={styles.modalTrackDuration}>
                        {Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Bottom Tab Bar */}
      <View style={[
        styles.bottomTabBar,
        { paddingBottom: insets.bottom || 10 },
      ]}>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home-outline" size={24} color="#999" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search-outline" size={24} color="#999" />
          <Text style={styles.tabLabel}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Library')}>
          <Ionicons name="library-outline" size={24} color="#999" />
          <Text style={styles.tabLabel}>Library</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabItem, styles.activeTab]}>
          <Ionicons name="person" size={24} color="#FF4893" />
          <Text style={[styles.tabLabel, styles.activeTabLabel]}>Artist</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 10,
    height: HEADER_MAX_HEIGHT,
  },
  headerGradient: {
    height: '100%',
    width: '100%',
    paddingHorizontal: 16,
  },
  headerNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: HEADER_MIN_HEIGHT,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  optionsButton: {
    padding: 5,
  },
  artistInfoContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  artistImageContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    marginBottom: 16,
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistInitial: {
    color: '#fff',
    fontSize: 60,
    fontWeight: 'bold',
  },
  artistName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  artistMeta: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 20,
  },
  artistActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  playButton: {
    flex: 1,
    marginRight: 10,
    maxWidth: 150,
  },
  shuffleButton: {
    flex: 1,
    marginLeft: 10,
    maxWidth: 150,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollContent: {
    paddingTop: HEADER_MAX_HEIGHT,
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  songsContainer: {
    marginBottom: 20,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  trackLeftSection: {
    width: 30,
    alignItems: 'center',
  },
  trackNumber: {
    color: '#999',
    fontSize: 16,
  },
  trackMiddleSection: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  trackSubtitle: {
    color: '#999',
    fontSize: 14,
  },
  trackRightSection: {
    marginLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTrackText: {
    color: '#FF4893',
    fontWeight: '600',
  },
  albumsHorizontalList: {
    paddingRight: 16,
  },
  albumCard: {
    width: 160,
    marginRight: 16,
  },
  albumArtContainer: {
    width: 160,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  albumPlayButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  albumTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '500',
  },
  albumYear: {
    color: '#999',
    fontSize: 14,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
  },
  tabLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  activeTab: {
    opacity: 1,
  },
  activeTabLabel: {
    color: '#FF4893',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: 24,
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    padding: 20,
  },
  modalAlbumDetails: {
    alignItems: 'center',
    marginBottom: 30,
  },
  modalAlbumArt: {
    width: 180,
    height: 180,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalAlbumTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalAlbumArtist: {
    color: '#ccc',
    fontSize: 18,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  modalPlayButton: {
    flex: 1,
    marginRight: 10,
    maxWidth: 130,
  },
  modalShuffleButton: {
    flex: 1,
    marginLeft: 10,
    maxWidth: 130,
  },
  modalActionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalTrackList: {
    marginTop: 20,
  },
  modalTrackListTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalTrackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTrackNumberContainer: {
    width: 30,
    alignItems: 'center',
  },
  modalTrackNumber: {
    color: '#999',
    fontSize: 16,
  },
  modalTrackInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 12,
    paddingRight: 8,
  },
  modalTrackTitle: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  modalTrackDuration: {
    color: '#999',
    fontSize: 14,
    marginLeft: 16,
  },
});

export default ArtistScreen;
