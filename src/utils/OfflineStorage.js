import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

const OFFLINE_STORAGE_KEY = 'offline_tracks';
const OFFLINE_PLAYLISTS_KEY = 'offline_playlists';

// Get the appropriate directory for storing music files
const getMusicDirectory = async () => {
  if (Platform.OS === 'android') {
    // On Android, use the Music directory in external storage
    const musicDir = `${FileSystem.documentDirectory}Music/sono/`;
    const dirInfo = await FileSystem.getInfoAsync(musicDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(musicDir, { intermediates: true });
    }
    return musicDir;
  } else {
    // On iOS, use the app's documents directory
    const musicDir = `${FileSystem.documentDirectory}Music/`;
    const dirInfo = await FileSystem.getInfoAsync(musicDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(musicDir, { intermediates: true });
    }
    return musicDir;
  }
};

// Ensure the offline directory exists
const ensureOfflineDir = async () => {
  const musicDir = await getMusicDirectory();
  const offlineDir = `${musicDir}offline/`;
  const dirInfo = await FileSystem.getInfoAsync(offlineDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(offlineDir, { intermediates: true });
  }
  return offlineDir;
};

// Save a track for offline playback
export const saveTrackOffline = async (track) => {
  try {
    const offlineDir = await ensureOfflineDir();

    // Get existing offline tracks
    const offlineTracks = await getOfflineTracks();

    // Check if track is already saved
    if (offlineTracks.some(t => t.id === track.id)) {
      return true;
    }

    // Download the audio file
    const fileName = `${track.id}.mp3`;
    const filePath = `${offlineDir}${fileName}`;

    await FileSystem.downloadAsync(track.uri, filePath);

    // Save artwork if available
    let artworkPath = null;
    if (track.artwork) {
      const artworkFileName = `${track.id}_artwork.jpg`;
      const artworkFilePath = `${offlineDir}${artworkFileName}`;
      await FileSystem.downloadAsync(track.artwork, artworkFilePath);
      artworkPath = artworkFilePath;
    }

    // Create offline track object
    const offlineTrack = {
      ...track,
      uri: filePath,
      artwork: artworkPath,
      isOffline: true,
      downloadedAt: new Date().toISOString(),
    };

    // Save to storage
    await AsyncStorage.setItem(
      OFFLINE_STORAGE_KEY,
      JSON.stringify([...offlineTracks, offlineTrack])
    );

    return true;
  } catch (error) {
    console.error('Error saving track offline:', error);
    return false;
  }
};

// Get all offline tracks
export const getOfflineTracks = async () => {
  try {
    const tracks = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
    return tracks ? JSON.parse(tracks) : [];
  } catch (error) {
    console.error('Error getting offline tracks:', error);
    return [];
  }
};

// Remove a track from offline storage
export const removeOfflineTrack = async (trackId) => {
  try {
    const offlineTracks = await getOfflineTracks();
    const track = offlineTracks.find(t => t.id === trackId);

    if (track) {
      // Delete audio file
      if (track.uri) {
        await FileSystem.deleteAsync(track.uri, { idempotent: true });
      }

      // Delete artwork if exists
      if (track.artwork) {
        await FileSystem.deleteAsync(track.artwork, { idempotent: true });
      }

      // Update storage
      const updatedTracks = offlineTracks.filter(t => t.id !== trackId);
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updatedTracks));
    }

    return true;
  } catch (error) {
    console.error('Error removing offline track:', error);
    return false;
  }
};

// Save a playlist for offline playback
export const savePlaylistOffline = async (playlist) => {
  try {
    // Get existing offline playlists
    const offlinePlaylists = await getOfflinePlaylists();

    // Check if playlist is already saved
    if (offlinePlaylists.some(p => p.id === playlist.id)) {
      return true;
    }

    // Download all tracks in the playlist
    const offlineTracks = [];
    for (const track of playlist.tracks) {
      const success = await saveTrackOffline(track);
      if (success) {
        offlineTracks.push(track);
      }
    }

    // Create offline playlist object
    const offlinePlaylist = {
      ...playlist,
      tracks: offlineTracks,
      isOffline: true,
      downloadedAt: new Date().toISOString(),
    };

    // Save to storage
    await AsyncStorage.setItem(
      OFFLINE_PLAYLISTS_KEY,
      JSON.stringify([...offlinePlaylists, offlinePlaylist])
    );

    return true;
  } catch (error) {
    console.error('Error saving playlist offline:', error);
    return false;
  }
};

// Get all offline playlists
export const getOfflinePlaylists = async () => {
  try {
    const playlists = await AsyncStorage.getItem(OFFLINE_PLAYLISTS_KEY);
    return playlists ? JSON.parse(playlists) : [];
  } catch (error) {
    console.error('Error getting offline playlists:', error);
    return [];
  }
};

// Remove a playlist from offline storage
export const removeOfflinePlaylist = async (playlistId) => {
  try {
    const offlinePlaylists = await getOfflinePlaylists();
    const playlist = offlinePlaylists.find(p => p.id === playlistId);

    if (playlist) {
      // Remove all tracks in the playlist
      for (const track of playlist.tracks) {
        await removeOfflineTrack(track.id);
      }

      // Update storage
      const updatedPlaylists = offlinePlaylists.filter(p => p.id !== playlistId);
      await AsyncStorage.setItem(OFFLINE_PLAYLISTS_KEY, JSON.stringify(updatedPlaylists));
    }

    return true;
  } catch (error) {
    console.error('Error removing offline playlist:', error);
    return false;
  }
};

// Check if a track is available offline
export const isTrackOffline = async (trackId) => {
  const offlineTracks = await getOfflineTracks();
  return offlineTracks.some(track => track.id === trackId);
};

// Check if a playlist is available offline
export const isPlaylistOffline = async (playlistId) => {
  const offlinePlaylists = await getOfflinePlaylists();
  return offlinePlaylists.some(playlist => playlist.id === playlistId);
};

// Get offline storage usage
export const getOfflineStorageUsage = async () => {
  try {
    const offlineDir = await ensureOfflineDir();
    const dirInfo = await FileSystem.getInfoAsync(offlineDir);
    return dirInfo.exists ? dirInfo.size : 0;
  } catch (error) {
    console.error('Error getting offline storage usage:', error);
    return 0;
  }
};

// Clear all offline data
export const clearOfflineStorage = async () => {
  try {
    const offlineDir = await ensureOfflineDir();
    // Delete all files in the offline directory
    await FileSystem.deleteAsync(offlineDir, { idempotent: true });
    await ensureOfflineDir();

    // Clear storage keys
    await AsyncStorage.removeItem(OFFLINE_STORAGE_KEY);
    await AsyncStorage.removeItem(OFFLINE_PLAYLISTS_KEY);

    return true;
  } catch (error) {
    console.error('Error clearing offline storage:', error);
    return false;
  }
};

// Load an offline track for playback
export const loadOfflineTrack = async (track) => {
  try {
    if (!track.isOffline) {
      return null;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri: track.uri },
      { shouldPlay: false }
    );

    return sound;
  } catch (error) {
    console.error('Error loading offline track:', error);
    return null;
  }
};
