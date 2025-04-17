import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AlbumArt from './AlbumArt';
import { useAudio } from '../context/AudioContext';

const TrackContextMenu = ({
  isVisible,
  onClose,
  track,
  onAddToPlaylist,
  onToggleLike,
}) => {
  const { isTrackLiked, playTrack } = useAudio();

  if (!track) {
    return null;
  }
  const liked = isTrackLiked ? isTrackLiked(track.id) : false;

  const handlePlay = () => {
    if (playTrack) {
      playTrack(track, [track], 0);
    }
    onClose();
  };

  const handleLike = () => {
    if (onToggleLike) {
      onToggleLike(track.id);
    }
    onClose();
  };

  const handleAddToPlaylist = () => {
    if (onAddToPlaylist) {
      onAddToPlaylist(track);
    }
    onClose();
  };

  const handleGoToAlbum = () => {
    // Navigate to album view if implemented
    onClose();
  };

  const handleGoToArtist = () => {
    // Navigate to artist view if implemented
    onClose();
  };

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <BlurView intensity={40} tint="dark" style={styles.menuBlur}>
            <View style={styles.menuContainer}>
              <View style={styles.handle} />

              <View style={styles.trackInfoContainer}>
                <AlbumArt
                  track={track}
                  size={60}
                  style={styles.albumArt}
                  textSize={24}
                />
                <View style={styles.textContainer}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
                  {track.album && <Text style={styles.trackAlbum} numberOfLines={1}>{track.album}</Text>}
                </View>
              </View>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={styles.actionButton} onPress={handlePlay}>
                  <LinearGradient
                    colors={['#FF4893', '#FF7676']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="play" size={24} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionButtonText}>Play Now</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                  <LinearGradient
                    colors={liked ? ['#FF4893', '#FF7676'] : ['#333', '#222']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons
                      name={liked ? 'heart' : 'heart-outline'}
                      size={22}
                      color="#fff"
                    />
                  </LinearGradient>
                  <Text style={styles.actionButtonText}>
                    {liked ? 'Remove from Liked' : 'Add to Liked'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleAddToPlaylist}>
                  <LinearGradient
                    colors={['#8C52FF', '#5CE1E6']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="add-circle-outline" size={22} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionButtonText}>Add to Playlist</Text>
                </TouchableOpacity>

                {track.album && (
                  <TouchableOpacity style={styles.actionButton} onPress={handleGoToAlbum}>
                    <LinearGradient
                      colors={['#00C9FF', '#92FE9D']}
                      style={styles.actionButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="disc" size={22} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.actionButtonText}>Go to Album</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.actionButton} onPress={handleGoToArtist}>
                  <LinearGradient
                    colors={['#FC6767', '#FC9D67']}
                    style={styles.actionButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="person" size={22} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.actionButtonText}>Go to Artist</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 320,
  },
  menuContainer: {
    padding: 16,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: 16,
  },
  trackInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  albumArt: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginBottom: 2,
  },
  trackAlbum: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  actionButtonsContainer: {
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  actionButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TrackContextMenu;
