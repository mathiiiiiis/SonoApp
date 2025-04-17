// MiniPlayer.js - Fixed without transparency
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useAudio } from '../context/AudioContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import AlbumArt from '../components/AlbumArt';

const MiniPlayer = ({ onPress }) => {
  const navigation = useNavigation();
  const audioContext = useAudio(); // Get the whole context first

  // Move all hooks before any conditional returns
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        Animated.spring(scaleAnim, {
          toValue: 0.97,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 10) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        if (gestureState.dx < -80) {
          // Swipe left - play next
          Animated.spring(slideAnim, {
            toValue: -300,
            useNativeDriver: true,
          }).start(() => {
            handleNext();
            slideAnim.setValue(0);
          });
        } else if (gestureState.dx > 80) {
          // Swipe right - not implemented
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        } else {
          // Return to center
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Check if context is fully ready before destructuring
  // We check a few key properties that are likely used immediately.
  if (
    !audioContext ||
    typeof audioContext.currentTrack === 'undefined' ||
    typeof audioContext.isPlaying === 'undefined' ||
    typeof audioContext.isLoading === 'undefined'
  ) {
      // Return null or a minimal placeholder if context isn't ready
      // console.log("MiniPlayer: AudioContext not fully initialized yet.");
      return null;
  }

  // Now safe to destructure
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlayPause,
    handleNext,
    playbackPosition,
    playbackDuration,
    isTrackLiked,
    toggleLike,
    addToPlaylist,
    playlists,
  } = audioContext;

  if (!currentTrack) {
    return null;
  }

  // Calculate progress percentage
  const progress = playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;

  const showContextMenuHandler = () => {
    setShowContextMenu(true);
  };

  const hideContextMenu = () => {
    setShowContextMenu(false);
  };

  const showPlaylistMenuHandler = () => {
    setShowContextMenu(false);
    setShowPlaylistMenu(true);
  };

  const hidePlaylistMenu = () => {
    setShowPlaylistMenu(false);
  };

  const handleLike = () => {
    toggleLike(currentTrack.id);
    hideContextMenu();
  };

  const handleAddToPlaylist = (playlistId) => {
    addToPlaylist(playlistId, currentTrack);
    hidePlaylistMenu();
  };

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            transform: [
              { translateX: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.touchableArea}
          onPress={onPress}
          onLongPress={showContextMenuHandler}
          activeOpacity={0.9}
          delayLongPress={500}
        >
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.content}>
            <View style={styles.trackInfo}>
              <AlbumArt
                track={currentTrack}
                size={44}
                style={styles.artwork}
                textSize={16}
              />

              <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
                <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
              </View>
            </View>

            <View style={styles.controls}>
              {isLoading ? (
                <ActivityIndicator size="small" color="#FF4893" />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                  >
                    <LinearGradient
                      colors={['#FF4893', '#FF7676']}
                      style={styles.playButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={22}
                        color="#fff"
                      />
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                  >
                    <Ionicons name="play-skip-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Context Menu Modal */}
      <Modal
        transparent={true}
        visible={showContextMenu}
        animationType="fade"
        onRequestClose={hideContextMenu}
      >
        <TouchableWithoutFeedback onPress={hideContextMenu}>
          <View style={styles.modalOverlay}>
            <View style={styles.contextMenu}>
              <View style={styles.contextMenuHandle} />

              <View style={styles.contextMenuTrackInfo}>
                <AlbumArt
                  track={currentTrack}
                  size={50}
                  style={styles.contextMenuArt}
                  textSize={20}
                />
                <View style={styles.contextMenuTextContainer}>
                  <Text style={styles.contextMenuTitle} numberOfLines={1}>{currentTrack.title}</Text>
                  <Text style={styles.contextMenuArtist} numberOfLines={1}>{currentTrack.artist}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={handleLike}
              >
                <LinearGradient
                  colors={isTrackLiked(currentTrack.id) ? ['#FF4893', '#FF7676'] : ['#333', '#222']}
                  style={styles.contextMenuIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={isTrackLiked(currentTrack.id) ? 'heart' : 'heart-outline'}
                    size={22}
                    color="#fff"
                  />
                </LinearGradient>
                <Text style={styles.contextMenuText}>
                  {isTrackLiked(currentTrack.id) ? 'Remove from Liked' : 'Add to Liked'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={showPlaylistMenuHandler}
              >
                <LinearGradient
                  colors={['#8C52FF', '#5CE1E6']}
                  style={styles.contextMenuIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.contextMenuText}>Add to Playlist</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={hideContextMenu}
              >
                <LinearGradient
                  colors={['#00C9FF', '#92FE9D']}
                  style={styles.contextMenuIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="share-outline" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.contextMenuText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={hideContextMenu}
              >
                <LinearGradient
                  colors={['#FC6767', '#FC9D67']}
                  style={styles.contextMenuIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="information-circle-outline" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.contextMenuText}>Song Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Playlist Selection Modal */}
      <Modal
        transparent={true}
        visible={showPlaylistMenu}
        animationType="slide"
        onRequestClose={hidePlaylistMenu}
      >
        <TouchableWithoutFeedback onPress={hidePlaylistMenu}>
          <View style={styles.modalOverlay}>
            <View style={styles.playlistMenu}>
              <View style={styles.playlistMenuHandle} />

              <View style={styles.playlistMenuHeader}>
                <Text style={styles.playlistMenuTitle}>Add to Playlist</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={hidePlaylistMenu}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.playlistList}>
                {playlists.length > 0 ? (
                  playlists.map(playlist => (
                    <TouchableOpacity
                      key={playlist.id}
                      style={styles.playlistItem}
                      onPress={() => handleAddToPlaylist(playlist.id)}
                    >
                      <LinearGradient
                        colors={getPlaylistColors(playlist.name)}
                        style={styles.playlistItemIcon}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="musical-notes" size={18} color="#fff" />
                      </LinearGradient>
                      <View style={styles.playlistItemContent}>
                        <Text style={styles.playlistItemText}>{playlist.name}</Text>
                        <Text style={styles.playlistItemCount}>{playlist.tracks.length} tracks</Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color="#FF4893" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyPlaylistContainer}>
                    <Ionicons name="folder-open-outline" size={50} color="#555" />
                    <Text style={styles.emptyPlaylistText}>No playlists yet</Text>
                    <Text style={styles.emptyPlaylistSubtext}>
                      Create a playlist to organize your music
                    </Text>
                    <TouchableOpacity
                      style={styles.createPlaylistButton}
                      onPress={() => {
                        hidePlaylistMenu();
                        navigation.navigate('Playlists');
                      }}
                    >
                      <LinearGradient
                        colors={['#FF4893', '#FF7676']}
                        style={styles.createPlaylistGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.createPlaylistText}>Create Playlist</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

// Helper function to get random gradient colors for playlists
const getPlaylistColors = (playlistName) => {
  const colors = [
    ['#FF4893', '#FF7676'], // Pink to light red
    ['#8C52FF', '#5CE1E6'], // Purple to cyan
    ['#00C9FF', '#92FE9D'], // Blue to green
    ['#FC6767', '#FC9D67'], // Red to orange
    ['#429E9D', '#6DBA82'], // Teal to light green
    ['#904E95', '#E96443'], // Purple to orange
    ['#4E65FF', '#92EFFD'], // Blue to light blue
  ];

  // Simple hash function to get consistent colors for the same playlist name
  const index = playlistName.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0) % colors.length;

  return colors[index];
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    height: 70,
    backgroundColor: '#1A1A1A', // Darker background
  },
  touchableArea: {
    width: '100%',
    height: '100%',
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF4893', // Modern pink accent color
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    flex: 1,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  artist: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    marginRight: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    width: 280,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  contextMenuHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: 16,
  },
  contextMenuTrackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  contextMenuArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  contextMenuTextContainer: {
    flex: 1,
  },
  contextMenuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contextMenuArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contextMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contextMenuText: {
    color: '#fff',
    fontSize: 16,
  },
  playlistMenu: {
    backgroundColor: '#1A1A1A', // Match container background
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '70%',
  },
  playlistMenuHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  playlistMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  playlistMenuTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistList: {
    paddingBottom: 30,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  playlistItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  playlistItemContent: {
    flex: 1,
  },
  playlistItemText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  playlistItemCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  emptyPlaylistContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyPlaylistText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPlaylistSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  createPlaylistButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  createPlaylistGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  createPlaylistText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MiniPlayer;
