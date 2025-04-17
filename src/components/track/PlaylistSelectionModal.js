import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAudio } from '../context/AudioContext';

const PlaylistSelectionModal = ({ visible, onClose, onSelect, track }) => {
  const { playlists } = useAudio();
  const navigation = useNavigation();

  // Get random gradient colors for playlists
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

  const renderPlaylistItem = ({ item }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => onSelect(item.id)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={getPlaylistColors(item.name)}
        style={styles.playlistIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="musical-notes" size={18} color="#fff" />
      </LinearGradient>

      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.playlistCount}>{item.tracks.length} tracks</Text>
      </View>

      <Ionicons name="add-circle" size={24} color="#FF4893" />
    </TouchableOpacity>
  );

  const handleCreatePlaylist = () => {
    onClose();
    // Navigate to playlist creation
    navigation.navigate('Playlists');
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <BlurView intensity={40} tint="dark" style={styles.modalBlur}>
            <View style={styles.modalContent}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Add to Playlist</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {track && (
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
                </View>
              )}

              {playlists.length > 0 ? (
                <FlatList
                  data={playlists}
                  renderItem={renderPlaylistItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.playlistList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-open-outline" size={50} color="#555" />
                  <Text style={styles.emptyText}>No playlists yet</Text>
                  <Text style={styles.emptySubtext}>
                    Create a playlist to organize your music
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreatePlaylist}
              >
                <LinearGradient
                  colors={['#FF4893', '#FF7676']}
                  style={styles.createButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="add" size={20} color="#fff" style={styles.createButtonIcon} />
                  <Text style={styles.createButtonText}>Create New Playlist</Text>
                </LinearGradient>
              </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  modalBlur: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
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
  trackInfo: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 16,
    marginBottom: 16,
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
  playlistList: {
    paddingVertical: 8,
    maxHeight: 300,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  playlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  playlistCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  createButtonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PlaylistSelectionModal;
