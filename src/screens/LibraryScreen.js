import React, { useState, useCallback, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Image, Animated } from 'react-native';
import { useAudio } from '../context/AudioContext';
// eslint-disable-next-line no-unused-vars
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// eslint-disable-next-line no-unused-vars
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackItem from '../components/track/TrackItem';
import SearchBar from '../components/search/SearchBar';
import MiniPlayer from '../components/player/MiniPlayer';

// Import tab components
import AlbumsTab from '../components/library/AlbumsTab';
import SongsTab from '../components/library/SongsTab';
import PlaylistsTab from '../components/library/PlaylistsTab';

const LibraryScreen = ({ navigation }) => {
  const { audioFiles, playTrack, addToPlaylist, playlists, currentTrack } = useAudio();
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [activeTrack, setActiveTrack] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Songs');
  const insets = useSafeAreaInsets();

  // Add animation values
  const tabAnimation = useRef(new Animated.Value(0)).current;
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchTimeout = useRef(null);

  const handleTabPress = (tabName) => {
    // Animate out current tab
    Animated.timing(tabAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tabName);
      // Animate in new tab
      Animated.timing(tabAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handlePlayTrack = useCallback((track, index) => {
    playTrack(track, audioFiles, index);
    setActiveTrack(track);
    navigation.navigate('Now Playing');
  }, [playTrack, audioFiles, navigation]);

  const showAddToPlaylist = useCallback((track) => {
    setSelectedTrack(track);
    setShowPlaylistPicker(true);
  }, []);

  const addToSelectedPlaylist = (playlistId) => {
    if (selectedTrack) {
      addToPlaylist(playlistId, selectedTrack);
      setShowPlaylistPicker(false);
      setSelectedTrack(null);
    }
  };

  const handleSearch = (query) => {
    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Animate search bar
    Animated.sequence([
      Animated.timing(searchAnimation, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(searchAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Debounce search
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(query);
    }, 300);
  };

  // eslint-disable-next-line no-unused-vars
  const keyExtractor = useCallback(item => item.id, []);

  // eslint-disable-next-line no-unused-vars
  const getItemLayout = useCallback((data, index) => ({
    length: 72,
    offset: 72 * index,
    index,
  }), []);


  // eslint-disable-next-line no-unused-vars
  const renderItem = useCallback(({ item, index }) => (
    <TrackItem
      track={item}
      onPress={() => handlePlayTrack(item, index)}
      onMenuPress={() => showAddToPlaylist(item)}
      isPlaying={activeTrack?.id === item.id || currentTrack?.id === item.id}
    />
  ), [activeTrack?.id, currentTrack?.id, handlePlayTrack, showAddToPlaylist]);

  const renderPlaylistItem = ({ item }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => addToSelectedPlaylist(item.id)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#FF4893', '#FF7676']}
        style={styles.playlistItemIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="musical-notes" size={18} color="#fff" />
      </LinearGradient>
      <View style={styles.playlistItemContent}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.playlistTrackCount}>{item.tracks.length} tracks</Text>
      </View>
      <Ionicons name="add-circle" size={24} color="#FF4893" />
    </TouchableOpacity>
  );

  const renderPlaylistPicker = () => (
    <View style={styles.modalOverlay}>
      <TouchableOpacity
        style={styles.modalContent}
        activeOpacity={1}
        onPress={() => setShowPlaylistPicker(false)}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add to Playlist</Text>
          <TouchableOpacity
            onPress={() => setShowPlaylistPicker(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={playlists}
          renderItem={renderPlaylistItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.playlistList}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Animated.View style={[
        styles.searchContainer,
        {
          transform: [{ scale: searchAnimation }],
          opacity: searchAnimation,
        },
      ]}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          onSubmit={handleSearch}
          placeholder="Search your library..."
          data={audioFiles}
          style={styles.searchBar}
        />
      </Animated.View>

      {/* Custom Tab Bar */}
      <View style={styles.customTabBar}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'Songs' && styles.activeTabButton,
          ]}
          onPress={() => handleTabPress('Songs')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'Songs' && styles.activeTabButtonText,
          ]}>
            Songs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'Albums' && styles.activeTabButton,
          ]}
          onPress={() => handleTabPress('Albums')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'Albums' && styles.activeTabButtonText,
          ]}>
            Albums
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'Playlists' && styles.activeTabButton,
          ]}
          onPress={() => handleTabPress('Playlists')}
        >
          <Text style={[
            styles.tabButtonText,
            activeTab === 'Playlists' && styles.activeTabButtonText,
          ]}>
            Playlists
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={[
        styles.tabContent,
        {
          opacity: tabAnimation,
          transform: [{
            translateX: tabAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        },
      ]}>
        {activeTab === 'Songs' && (
          <SongsTab
            navigation={navigation}
            searchQuery={searchQuery}
          />
        )}
        {activeTab === 'Albums' && (
          <AlbumsTab
            navigation={navigation}
            searchQuery={searchQuery}
          />
        )}
        {activeTab === 'Playlists' && (
          <PlaylistsTab
            navigation={navigation}
            searchQuery={searchQuery}
          />
        )}
      </Animated.View>

      {showPlaylistPicker && renderPlaylistPicker()}

      <View style={styles.miniPlayerContainer}>
        <MiniPlayer />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsButton: {
    padding: 8,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    maxWidth: '80%',
    alignSelf: 'center',
  },
  customTabBar: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#121212',
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTabButton: {
    // You can add specific styles for active tab if needed
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeTabButtonText: {
    color: '#FF4893',
    fontWeight: 'bold',
  },
  indicatorContainer: {
    height: 3,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    height: 3,
    width: '33.3%',
    backgroundColor: '#FF4893',
  },
  tabContent: {
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '80%',
    maxHeight: '80%',
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  playlistList: {
    padding: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  playlistItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  playlistTrackCount: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 12,
    zIndex: 10,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
});

export default LibraryScreen;
