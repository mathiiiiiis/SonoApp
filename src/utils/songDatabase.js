import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line no-unused-vars
import { getCachedArtwork, cacheArtwork, refreshArtworkForAsset } from './cacheManager';

// Storage key for processed songs
const PROCESSED_SONGS_KEY = 'processed_songs';

// Cache expiration time in milliseconds (7 days)
const CACHE_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000;

/**
 * Get all processed songs from storage
 * @returns {Promise<Array>} - A promise that resolves to an array of processed songs
 */
export const getProcessedSongs = async () => {
  try {
    const songsJson = await AsyncStorage.getItem(PROCESSED_SONGS_KEY);
    if (!songsJson) {
      return [];
    }

    const songs = JSON.parse(songsJson);

    // Filter out expired entries
    const now = Date.now();
    const validSongs = songs.filter(song => {
      if (!song.timestamp || (now - song.timestamp) > CACHE_EXPIRATION_TIME) {
        // Remove expired song from storage
        removeProcessedSong(song.id).catch(console.error);
        return false;
      }
      return true;
    });

    // If we filtered out any songs, update storage
    if (validSongs.length !== songs.length) {
      await AsyncStorage.setItem(PROCESSED_SONGS_KEY, JSON.stringify(validSongs));
    }

    return validSongs;
  } catch (error) {
    console.error('Error getting processed songs:', error);
    return [];
  }
};

/**
 * Save a processed song to storage
 * @param {string} songId - The ID of the song to save
 * @param {Object} songData - The song data to save
 * @returns {Promise<void>} - A promise that resolves when the song is saved
 */
export const saveProcessedSong = async (songId, songData) => {
  try {
    if (!songId || !songData) {
      console.warn('Cannot save song: Missing song ID or song data');
      return;
    }

    // Add timestamp to song data
    const songWithTimestamp = {
      ...songData,
      id: songId,
      timestamp: Date.now(),
    };

    // Ensure artwork data is NOT saved directly to prevent row size errors
    if (songWithTimestamp.artwork) {
      // Store only the artwork URI or reference, not the full artwork data
      songWithTimestamp.artwork = typeof songWithTimestamp.artwork === 'string'
        ? songWithTimestamp.artwork
        : songWithTimestamp.artwork?.uri || null;
    }

    // Get existing songs
    const songs = await getProcessedSongs();

    // Update or add the song using songId
    const index = songs.findIndex(s => s.id === songId);
    if (index >= 0) {
      songs[index] = songWithTimestamp;
    } else {
      songs.push(songWithTimestamp);
    }

    // Save to storage
    await AsyncStorage.setItem(PROCESSED_SONGS_KEY, JSON.stringify(songs));
  } catch (error) {
    console.error(`Error saving processed song ${songId}:`, error);
  }
};

/**
 * Remove a processed song from storage
 * @param {string} songId - The ID of the song to remove
 * @returns {Promise<void>} - A promise that resolves when the song is removed
 */
export const removeProcessedSong = async (songId) => {
  try {
    if (!songId) {
      console.warn('Cannot remove song: Missing song ID');
      return;
    }

    // Get existing songs
    const songs = await getProcessedSongs();

    // Filter out the song
    const updatedSongs = songs.filter(song => song.id !== songId);

    // Save to storage
    await AsyncStorage.setItem(PROCESSED_SONGS_KEY, JSON.stringify(updatedSongs));
  } catch (error) {
    console.error('Error removing processed song:', error);
  }
};

/**
 * Check if a song has been processed
 * @param {string} songId - The ID of the song to check
 * @returns {Promise<boolean>} - A promise that resolves to true if the song has been processed
 */
export const isSongProcessed = async (songId) => {
  try {
    if (!songId) {
      console.warn('Cannot check song: Missing song ID');
      return false;
    }

    const songs = await getProcessedSongs();
    return songs.some(song => song.id === songId);
  } catch (error) {
    console.error(`Error checking if song ${songId} is processed:`, error);
    return false;
  }
};

/**
 * Get a processed song by ID
 * @param {string} songId - The ID of the song to get
 * @returns {Promise<Object|null>} - A promise that resolves to the song or null if not found
 */
export const getProcessedSong = async (songId) => {
  try {
    if (!songId) {
      console.warn('Cannot get song: Missing song ID');
      return null;
    }

    const songs = await getProcessedSongs();
    return songs.find(song => song.id === songId) || null;
  } catch (error) {
    console.error(`Error getting processed song ${songId}:`, error);
    return null;
  }
};

/**
 * Clear all processed songs from storage
 * @returns {Promise<void>} - A promise that resolves when all songs are cleared
 */
export const clearProcessedSongs = async () => {
  try {
    await AsyncStorage.removeItem(PROCESSED_SONGS_KEY);
    console.log('Cleared all processed songs from storage');
  } catch (error) {
    console.error('Error clearing processed songs:', error);
  }
};

/**
 * Check if a song's artwork needs to be refreshed
 * @param {Object} song - The song to check
 * @param {number} maxAge - Maximum age of artwork in milliseconds
 * @returns {boolean} - Whether the artwork needs to be refreshed
 */
export const isArtworkRefreshNeeded = (song, maxAge = CACHE_EXPIRATION_TIME) => {
  if (!song || !song.timestamp) {
    return true;
  }

  const now = Date.now();
  return (now - song.timestamp) > maxAge;
};

/**
 * Get songs with expired artwork
 * @param {number} maxAge - Maximum age of artwork in milliseconds
 * @returns {Promise<Array>} - A promise that resolves to an array of songs with expired artwork
 */
export const getSongsWithExpiredArtwork = async (maxAge = CACHE_EXPIRATION_TIME) => {
  try {
    const songs = await getProcessedSongs();
    return songs.filter(song => isArtworkRefreshNeeded(song, maxAge));
  } catch (error) {
    console.error('Error getting songs with expired artwork:', error);
    return [];
  }
};

/**
 * Refresh artwork for a specific song
 * @param {Object} song - The song to refresh artwork for
 * @returns {Promise<Object|null>} - A promise that resolves to the updated song or null
 */
export const refreshSongArtwork = async (song) => {
  if (!song || !song.id || !song.uri) {
    console.warn('Cannot refresh artwork: Invalid song data or missing ID/URI');
    return null;
  }

  try {
    console.log(`Refreshing artwork for song: ${song.title || song.id}`);

    // Try to get artwork from cache first
    const cachedArtwork = await getCachedArtwork(song.uri);
    if (cachedArtwork) {
      // Update song with cached artwork
      const updatedSong = {
        ...song,
        artwork: cachedArtwork,
        timestamp: Date.now(),
      };

      // Save updated song
      await saveProcessedSong(song.id, updatedSong);
      return updatedSong;
    }

    // If no cached artwork, try to refresh it
    const asset = {
      uri: song.uri,
      filename: song.filename || song.title || song.id,
    };

    const artwork = await refreshArtworkForAsset(asset);
    if (artwork) {
      // Update song with new artwork
      const updatedSong = {
        ...song,
        artwork,
        timestamp: Date.now(),
      };

      // Save updated song
      await saveProcessedSong(song.id, updatedSong);
      return updatedSong;
    }

    console.warn(`No artwork found for song: ${song.title || song.id}`);
    return null;
  } catch (error) {
    console.error(`Error refreshing artwork for song ${song.title || song.id}:`, error);
    return null;
  }
};

const songDatabase = {
  getProcessedSongs,
  saveProcessedSong,
  removeProcessedSong,
  isSongProcessed,
  getProcessedSong,
  clearProcessedSongs,
  isArtworkRefreshNeeded,
  getSongsWithExpiredArtwork,
  refreshSongArtwork,
};

export default songDatabase;
