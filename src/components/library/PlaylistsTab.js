import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Animated, TextInput } from 'react-native';
import { useAudio } from '../../context/AudioContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const PlaylistsTab = ({ route, navigation, searchQuery }) => {
  const { playlists, createPlaylist, deletePlaylist, createSmartPlaylist } = useAudio();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showSmartPlaylistModal, setShowSmartPlaylistModal] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedSmartType, setSelectedSmartType] = useState('favorites');

  // Animation refs
  const modalAnimValue = useRef(new Animated.Value(0)).current;

  // Filter playlists based on search query
  const filteredPlaylists = searchQuery
    ? playlists.filter(playlist =>
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : playlists;

  // Get gradient colors based on playlist name
  const getGradientColors = (playlistName) => {
    const colors = [
      ['#FF4893', '#FF7676'],
      ['#8C52FF', '#5CE1E6'],
      ['#00C9FF', '#92FE9D'],
      ['#FC6767', '#FC9D67'],
      ['#429E9D', '#6DBA82'],
    ];

    const index = playlistName.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0) % colors.length;

    return colors[index];
  };

  // Handle modal animations
  React.useEffect(() => {
    if (showCreateModal || showOptionsModal || showSmartPlaylistModal) {
      Animated.timing(modalAnimValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnimValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showCreateModal, showOptionsModal, showSmartPlaylistModal, modalAnimValue]);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  const handleCreateSmartPlaylist = () => {
    if (newPlaylistName.trim()) {
      createSmartPlaylist(newPlaylistName.trim(), selectedSmartType);
      setNewPlaylistName('');
      setShowSmartPlaylistModal(false);
    }
  };

  const openPlaylistOptions = (playlist) => {
    setSelectedPlaylist(playlist);
    setShowOptionsModal(true);
  };

  const handleDeletePlaylist = () => {
    if (selectedPlaylist) {
      deletePlaylist(selectedPlaylist.id);
      setShowOptionsModal(false);
    }
  };

  const handlePlaylistDetails = (playlist) => {
    navigation.navigate('Playlist Details', { playlist });
  };

  const renderSmartPlaylistIcon = (playlist) => {
    if (!playlist.isSmart) {
      return null;
    }

    let iconName = 'star';
    switch (playlist.smartType) {
      case 'favorites':
        iconName = 'heart';
        break;
      case 'recentlyAdded':
        iconName = 'time';
        break;
      case 'mostPlayed':
        iconName = 'trending-up';
        break;
      default:
        iconName = 'star';
    }

    return (
      <View style={styles.smartIconContainer}>
        <Ionicons name={iconName} size={12} color="#fff" />
      </View>
    );
  };

  const renderPlaylistItem = ({ item }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handlePlaylistDetails(item)}
      onLongPress={() => openPlaylistOptions(item)}
    >
      <LinearGradient
        colors={getGradientColors(item.name)}
        style={styles.playlistIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="musical-notes" size={24} color="#fff" />
        {renderSmartPlaylistIcon(item)}
      </LinearGradient>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.trackCount}>{item.tracks.length} tracks</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  const renderCreatePlaylistModal = () => (
    <Modal
      visible={showCreateModal}
      transparent
      animationType="none"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowCreateModal(false)}
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: modalAnimValue,
              transform: [
                {
                  translateY: modalAnimValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Create New Playlist</Text>
          <TextInput
            style={styles.input}
            placeholder="Playlist Name"
            placeholderTextColor="#999"
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setNewPlaylistName('');
                setShowCreateModal(false);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createActionButton]}
              onPress={handleCreatePlaylist}
            >
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSmartPlaylistModal = () => (
    <Modal
      visible={showSmartPlaylistModal}
      transparent
      animationType="none"
      onRequestClose={() => setShowSmartPlaylistModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: modalAnimValue,
              transform: [
                {
                  translateY: modalAnimValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.modalTitle}>Create Smart Playlist</Text>
          <TextInput
            style={styles.input}
            placeholder="Playlist Name"
            placeholderTextColor="#999"
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            autoFocus
          />

          <Text style={styles.sectionTitle}>Playlist Type</Text>
          <View style={styles.smartTypeContainer}>
            <TouchableOpacity
              style={[
                styles.smartTypeOption,
                selectedSmartType === 'favorites' && styles.selectedSmartType,
              ]}
              onPress={() => setSelectedSmartType('favorites')}
            >
              <Ionicons name="heart" size={24} color={selectedSmartType === 'favorites' ? '#FF4893' : '#999'} />
              <Text style={[
                styles.smartTypeText,
                selectedSmartType === 'favorites' && styles.selectedSmartTypeText,
              ]}>Favorites</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.smartTypeOption,
                selectedSmartType === 'recentlyAdded' && styles.selectedSmartType,
              ]}
              onPress={() => setSelectedSmartType('recentlyAdded')}
            >
              <Ionicons name="time" size={24} color={selectedSmartType === 'recentlyAdded' ? '#FF4893' : '#999'} />
              <Text style={[
                styles.smartTypeText,
                selectedSmartType === 'recentlyAdded' && styles.selectedSmartTypeText,
              ]}>Recently Added</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.smartTypeOption,
                selectedSmartType === 'mostPlayed' && styles.selectedSmartType,
              ]}
              onPress={() => setSelectedSmartType('mostPlayed')}
            >
              <Ionicons name="trending-up" size={24} color={selectedSmartType === 'mostPlayed' ? '#FF4893' : '#999'} />
              <Text style={[
                styles.smartTypeText,
                selectedSmartType === 'mostPlayed' && styles.selectedSmartTypeText,
              ]}>Most Played</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setNewPlaylistName('');
                setShowSmartPlaylistModal(false);
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createActionButton]}
              onPress={handleCreateSmartPlaylist}
            >
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderOptionsModal = () => (
    <Modal
      visible={showOptionsModal}
      transparent
      animationType="none"
      onRequestClose={() => setShowOptionsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: modalAnimValue,
              transform: [
                {
                  translateY: modalAnimValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.modalTitle}>Playlist Options</Text>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              setShowOptionsModal(false);
              handlePlaylistDetails(selectedPlaylist);
            }}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.optionText}>Play All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              setShowOptionsModal(false);
              // Add edit functionality here
            }}
          >
            <Ionicons name="create" size={20} color="#fff" />
            <Text style={styles.optionText}>Edit Playlist</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, styles.deleteButton]}
            onPress={handleDeletePlaylist}
          >
            <Ionicons name="trash" size={20} color="#FF4893" />
            <Text style={[styles.optionText, styles.deleteText]}>Delete Playlist</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowOptionsModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <LinearGradient
            colors={['#FF4893', '#FF7676']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.createButtonText}>New Playlist</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowSmartPlaylistModal(true)}
        >
          <LinearGradient
            colors={['#8C52FF', '#5CE1E6']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="star" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Smart Playlist</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredPlaylists}
        renderItem={renderPlaylistItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      {renderCreatePlaylistModal()}
      {renderSmartPlaylistModal()}
      {renderOptionsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
  },
  createButton: {
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  createButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  playlistIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 2,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 16,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackCount: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#222',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#666',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  createActionButton: {
    backgroundColor: '#FF4893',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  optionText: {
    color: '#fff',
    marginLeft: 16,
    fontSize: 16,
  },
  deleteButton: {
    borderBottomWidth: 0,
  },
  deleteText: {
    color: '#FF4893',
  },
  closeButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  smartTypeContainer: {
    marginBottom: 20,
  },
  smartTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#333',
  },
  selectedSmartType: {
    backgroundColor: 'rgba(255, 72, 147, 0.2)',
    borderWidth: 1,
    borderColor: '#FF4893',
  },
  smartTypeText: {
    color: '#999',
    marginLeft: 12,
    fontSize: 16,
  },
  selectedSmartTypeText: {
    color: '#FF4893',
    fontWeight: '600',
  },
});

export default PlaylistsTab;
