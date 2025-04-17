import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useAudio } from '../context/AudioContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlbumArt from '../components/album/AlbumArt';

// Utility function to determine time of day based on current hour
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  return 'evening';
};

// Move component definitions outside of HomeScreen
const TrackItem = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.trackItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.albumArt}>
      <AlbumArt track={item} size={150} textSize={36} />
    </View>
    <View style={styles.trackInfo}>
      <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
    </View>
  </TouchableOpacity>
);

const AlbumItem = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.albumItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.albumCover}>
      <AlbumArt track={item} size={120} textSize={28} />
    </View>
    <Text style={styles.albumTitle} numberOfLines={1}>{item.album || 'Unknown Album'}</Text>
    <Text style={styles.albumArtist} numberOfLines={1}>{item.artist}</Text>
  </TouchableOpacity>
);

const ArtistItem = ({ item, onPress }) => (
  <TouchableOpacity
    style={styles.artistItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.artistAvatar}>
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} style={styles.artistImage} />
      ) : (
        <View style={[
          styles.artistImagePlaceholder,
          { backgroundColor: item.placeholderColor && typeof item.placeholderColor === 'string'
            ? item.placeholderColor
            : Array.isArray(item.placeholderColor) ? item.placeholderColor[0] : '#333' },
        ]}>
          <Text style={styles.artistImagePlaceholderText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </View>
    <Text style={styles.artistName} numberOfLines={1}>{item.name}</Text>
    <Text style={styles.artistTrackCount}>{item.trackCount} song{item.trackCount !== 1 ? 's' : ''}</Text>
  </TouchableOpacity>
);

const QuickActions = ({ onShuffleAll, onSearch }) => (
  <View style={styles.quickActionsContainer}>
    <View style={styles.actionRow}>
      <TouchableOpacity
        style={styles.mainActionButton}
        onPress={onShuffleAll}
      >
        <LinearGradient
          colors={['#373737', '#202020']}
          style={styles.mainActionGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.mainActionContent}>
            <View style={styles.mainActionIconContainer}>
              <Ionicons name="shuffle" size={24} color="#fff" />
            </View>
            <Text style={styles.mainActionText}>Shuffle All</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.mainActionButton}
        onPress={onSearch}
      >
        <LinearGradient
          colors={['#373737', '#202020']}
          style={styles.mainActionGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.mainActionContent}>
            <View style={styles.mainActionIconContainer}>
              <Ionicons name="search" size={24} color="#fff" />
            </View>
            <Text style={styles.mainActionText}>Search</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </View>
);

// Move section render functions outside of HomeScreen
const ActionsSection = ({ onShuffleAll, onSearch }) => (
  <QuickActions
    onShuffleAll={onShuffleAll}
    onSearch={onSearch}
  />
);

const RecentlyPlayedSection = ({
  displayRecentlyPlayed,
  expandedSection,
  handleSeeAll,
  handlePlayTrack,
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Recently Played</Text>
      <TouchableOpacity onPress={() => handleSeeAll('recentlyPlayed')}>
        <Text style={styles.seeAllText}>
          {expandedSection === 'recentlyPlayed' ? 'Show Less' : 'See All'}
        </Text>
      </TouchableOpacity>
    </View>
    <FlatList
      data={displayRecentlyPlayed}
      renderItem={({ item }) => (
        <TrackItem
          item={item}
          onPress={() => handlePlayTrack(item)}
        />
      )}
      keyExtractor={item => item.id}
      horizontal={expandedSection !== 'recentlyPlayed'}
      numColumns={expandedSection === 'recentlyPlayed' ? 2 : 1}
      key={expandedSection === 'recentlyPlayed' ? 'grid' : 'list'}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={expandedSection !== 'recentlyPlayed'}
      nestedScrollEnabled
    />
  </View>
);

const ArtistsSection = ({
  displayArtists,
  expandedSection,
  handleSeeAll,
  navigation,
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Your Artists</Text>
      <TouchableOpacity onPress={() => handleSeeAll('artists')}>
        <Text style={styles.seeAllText}>
          {expandedSection === 'artists' ? 'Show Less' : 'See All'}
        </Text>
      </TouchableOpacity>
    </View>
    <FlatList
      data={displayArtists}
      renderItem={({ item }) => (
        <ArtistItem
          item={item}
          onPress={() => navigation.navigate('Artist', { artist: item.name })}
        />
      )}
      keyExtractor={item => item.name}
      horizontal={expandedSection !== 'artists'}
      numColumns={expandedSection === 'artists' ? 4 : 1}
      key={expandedSection === 'artists' ? 'grid' : 'list'}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={expandedSection !== 'artists'}
      nestedScrollEnabled
    />
  </View>
);

const AlbumsSection = ({
  displayAlbums,
  expandedSection,
  handleSeeAll,
  handlePlayTrack,
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Your Albums</Text>
      <TouchableOpacity onPress={() => handleSeeAll('albums')}>
        <Text style={styles.seeAllText}>
          {expandedSection === 'albums' ? 'Show Less' : 'See All'}
        </Text>
      </TouchableOpacity>
    </View>
    <FlatList
      data={displayAlbums}
      renderItem={({ item }) => (
        <AlbumItem
          item={item}
          onPress={() => handlePlayTrack(item)}
        />
      )}
      keyExtractor={item => item.id}
      horizontal={expandedSection !== 'albums'}
      numColumns={expandedSection === 'albums' ? 3 : 1}
      key={expandedSection === 'albums' ? 'grid' : 'list'}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={expandedSection !== 'albums'}
      nestedScrollEnabled
    />
  </View>
);

const MadeForYouSection = ({
  displayMadeForYou,
  expandedSection,
  handleSeeAll,
  handlePlayTrack,
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Made For You</Text>
      <TouchableOpacity onPress={() => handleSeeAll('madeForYou')}>
        <Text style={styles.seeAllText}>
          {expandedSection === 'madeForYou' ? 'Show Less' : 'See All'}
        </Text>
      </TouchableOpacity>
    </View>
    <FlatList
      data={displayMadeForYou}
      renderItem={({ item }) => (
        <TrackItem
          item={item}
          onPress={() => handlePlayTrack(item)}
        />
      )}
      keyExtractor={item => item.id}
      horizontal={expandedSection !== 'madeForYou'}
      numColumns={expandedSection === 'madeForYou' ? 2 : 1}
      key={expandedSection === 'madeForYou' ? 'grid' : 'list'}
      showsHorizontalScrollIndicator={false}
      scrollEnabled={expandedSection !== 'madeForYou'}
      nestedScrollEnabled
    />
  </View>
);

const HomeScreen = ({ navigation }) => {
  const { audioFiles, playTrack, recentlyPlayed } = useAudio();
  const insets = useSafeAreaInsets();

  const [expandedSection, setExpandedSection] = useState(null);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay());

  // Update time of day when component mounts
  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
  }, []);

  const handlePlayTrack = (track) => {
    if (track.tracks) {
      // If it's an album, play all tracks from the album
      playTrack(track.tracks[0], track.tracks, 0);
    } else {
      // If it's a single track, play just that track
      playTrack(track, [track], 0);
    }
  };

  // Get unique artists
  const artists = audioFiles.reduce((acc, track) => {
    if (!acc[track.artist]) {
      acc[track.artist] = {
        name: track.artist,
        artwork: track.artwork,
        placeholderColor: track.placeholderColor,
        trackCount: 1,
      };
    } else {
      acc[track.artist].trackCount += 1;
    }
    return acc;
  }, {});

  const artistsArray = Object.values(artists);

  const albums = audioFiles.reduce((acc, track) => {
    const albumKey = `${track.album || 'Unknown'}_${track.artist}`;
    if (!acc[albumKey]) {
      acc[albumKey] = {
        ...track,
        tracks: [track],
      };
    } else {
      acc[albumKey].tracks.push(track);
    }
    return acc;
  }, {});

  const albumsArray = Object.values(albums);

  const handleSeeAll = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  const getDisplayData = (section, originalData, fullData) => {
    if (expandedSection === section) {
      return fullData;
    }
    return originalData;
  };

  const displayRecentlyPlayed = getDisplayData('recentlyPlayed', recentlyPlayed.slice(0, 10), recentlyPlayed);
  const displayAlbums = getDisplayData('albums', albumsArray.slice(0, 10), albumsArray);
  const displayArtists = getDisplayData('artists', artistsArray.slice(0, 10), artistsArray);
  const displayMadeForYou = getDisplayData('madeForYou', audioFiles.slice(0, 10), audioFiles.slice(0, 30));

  const handleShuffleAll = () => {
    // Play a random track from all audio files
    if (audioFiles.length > 0) {
      const randomIndex = Math.floor(Math.random() * audioFiles.length);
      playTrack(audioFiles[randomIndex], audioFiles, randomIndex);
    }
  };

  const handleSearch = () => {
    navigation.navigate('Search');
  };

  const sections = [
    {
      id: 'actions',
      render: () => (
        <ActionsSection
          onShuffleAll={handleShuffleAll}
          onSearch={handleSearch}
        />
      ),
    },
    recentlyPlayed.length > 0 ? {
      id: 'recentlyPlayed',
      render: () => (
        <RecentlyPlayedSection
          displayRecentlyPlayed={displayRecentlyPlayed}
          expandedSection={expandedSection}
          handleSeeAll={handleSeeAll}
          handlePlayTrack={handlePlayTrack}
        />
      ),
    } : null,
    {
      id: 'artists',
      render: () => (
        <ArtistsSection
          displayArtists={displayArtists}
          expandedSection={expandedSection}
          handleSeeAll={handleSeeAll}
          navigation={navigation}
        />
      ),
    },
    {
      id: 'albums',
      render: () => (
        <AlbumsSection
          displayAlbums={displayAlbums}
          expandedSection={expandedSection}
          handleSeeAll={handleSeeAll}
          handlePlayTrack={handlePlayTrack}
        />
      ),
    },
    {
      id: 'madeForYou',
      render: () => (
        <MadeForYouSection
          displayMadeForYou={displayMadeForYou}
          expandedSection={expandedSection}
          handleSeeAll={handleSeeAll}
          handlePlayTrack={handlePlayTrack}
        />
      ),
    },
  ].filter(Boolean);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <FlatList
        data={sections}
        renderItem={({ item }) => item.render()}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        // eslint-disable-next-line react/no-unstable-nested-components
        ListHeaderComponent={() => (
          <LinearGradient
            colors={['#373737', '#121212']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <View style={styles.header}>
              <Text style={styles.welcomeText}>Good {timeOfDay}</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handleSettingsPress}
                >
                  <Feather name="settings" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  headerGradient: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  quickActionsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mainActionButton: {
    flex: 0.48,
    height: 70,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mainActionGradient: {
    flex: 1,
    padding: 15,
  },
  mainActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainActionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  mainActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickCategoryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  genreList: {
    flexGrow: 0,
  },
  genreButton: {
    alignItems: 'center',
    marginRight: 18,
  },
  genreGradient: {
    width: 55,
    height: 55,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  genreText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#FF4893',
    fontSize: 14,
    fontWeight: '600',
  },
  trackItem: {
    width: 150,
    marginRight: 16,
    marginBottom: 16,
  },
  albumArt: {
    width: 150,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#333',
  },
  trackInfo: {
    width: '100%',
  },
  trackTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  albumItem: {
    width: 120,
    marginRight: 16,
    marginBottom: 16,
  },
  albumCover: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#333',
  },
  albumTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  // Artist styles
  artistItem: {
    width: 90,
    marginRight: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  artistAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#333',
  },
  artistImage: {
    width: '100%',
    height: '100%',
  },
  artistImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  artistImagePlaceholderText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  artistName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  artistTrackCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default HomeScreen;
