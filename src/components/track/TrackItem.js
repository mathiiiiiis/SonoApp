import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAudio } from '../context/AudioContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AlbumArt from './AlbumArt';

const TrackItem = ({
  track,
  onPress,
  index,
  isPlaying = false,
  showAlbum = false,
}) => {
  const { toggleLike, isTrackLiked, addToPlaylist, playlists } = useAudio();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const navigation = useNavigation();

  if (!track) {
    return null;
  }
  const handleMorePress = () => {
    setShowContextMenu(true);
  };

  const hideContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleLike = () => {
    toggleLike(track.id);
    hideContextMenu();
  };

  const showPlaylistMenuHandler = () => {
    setShowContextMenu(false);
    setShowPlaylistMenu(true);
  };

  const hidePlaylistMenu = () => {
    setShowPlaylistMenu(false);
  };

  const handleAddToPlaylist = (playlistId) => {
    addToPlaylist(playlistId, track);
    hidePlaylistMenu();
  };

  const liked = isTrackLiked ? isTrackLiked(track.id) : false;

  return (
    <>
      <TouchableOpacity
        style={[styles.container, isPlaying && styles.playing]}
        onPress={onPress}
        onLongPress={handleMorePress}
        activeOpacity={0.7}
        delayLongPress={500}
      >
        {index !== undefined && (
          <Text style={styles.index}>{index + 1}</Text>
        )}

        <View style={styles.albumArt}>
          <AlbumArt
            track={track}
            size={50}
            textSize={20}
          />
        </View>

        <View style={styles.trackInfo}>
          <Text
            style={[styles.title, isPlaying && styles.playingText]}
            numberOfLines={1}
          >
            {track.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {track.artist}
            {showAlbum && track.album && ` • ${track.album}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleMorePress}
        >
          <Feather name="more-vertical" size={20} color="#aaa" />
        </TouchableOpacity>

        {liked && (
          <View style={styles.likedIndicator}>
            <Ionicons name="heart" size={12} color="#FF4893" />
          </View>
        )}
      </TouchableOpacity>

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
                  track={track}
                  size={50}
                  style={styles.contextMenuArt}
                  textSize={20}
                />
                <View style={styles.contextMenuTextContainer}>
                  <Text style={styles.contextMenuTitle} numberOfLines={1}>{track.title}</Text>
                  <Text style={styles.contextMenuArtist} numberOfLines={1}>{track.artist}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={() => {
                  onPress();
                  hideContextMenu();
                }}
              >
                <LinearGradient
                  colors={['#FF4893', '#FF7676']}
                  style={styles.contextMenuIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="play" size={22} color="#fff" />
                </LinearGradient>
                <Text style={styles.contextMenuText}>Play Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contextMenuItem}
                onPress={handleLike}
              >
                <LinearGradient
                  colors={liked ? ['#FF4893', '#FF7676'] : ['#333', '#222']}
                  style={styles.contextMenuIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={22}
                    color="#fff"
                  />
                </LinearGradient>
                <Text style={styles.contextMenuText}>
                  {liked ? 'Remove from Liked' : 'Add to Liked'}
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
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  borderRadius: 8,
  backgroundColor: '#222',
  marginBottom: 8,
},
playing: {
  backgroundColor: 'rgba(255, 72, 147, 0.15)',
},
index: {
  color: '#aaa',
  fontSize: 14,
  marginRight: 12,
  width: 20,
  textAlign: 'center',
},
albumArt: {
  width: 50,
  height: 50,
  borderRadius: 8,
  marginRight: 12,
  overflow: 'hidden',
},
trackInfo: {
  flex: 1,
  justifyContent: 'center',
},
title: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '500',
  marginBottom: 4,
},
playingText: {
  color: '#FF4893',
  fontWeight: 'bold',
},
artist: {
  color: 'rgba(255,255,255,0.7)',
  fontSize: 14,
},
menuButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: 'rgba(255,255,255,0.1)',
  justifyContent: 'center',
  alignItems: 'center',
},
likedIndicator: {
  position: 'absolute',
  top: 10,
  right: 50,
  backgroundColor: 'rgba(255,72,147,0.2)',
  borderRadius: 10,
  width: 20,
  height: 20,
  alignItems: 'center',
  justifyContent: 'center',
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  justifyContent: 'center',
  alignItems: 'center',
},
contextMenu: {
  backgroundColor: '#262626',
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
  backgroundColor: '#262626',
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
  paddingBottom: 20,
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

export default TrackItem;
