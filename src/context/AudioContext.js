import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as OfflineStorage from '../utils/OfflineStorage';
import { getSongsAsync } from '../utils/mediaLibrary';

// Helper function to generate a color from a string
const generateColorFromString = (str) => {
  if (!str || typeof str !== 'string') {
    return '#FF4893';
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash * 32) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

// Create a wrapper for safe AsyncStorage operations
const safeStorage = {
  getItem: async (key, defaultValue = null) => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        return JSON.parse(value);
      }
      return defaultValue;
    } catch (error) {
      console.log(`Error getting ${key} from storage:`, error);
      return defaultValue;
    }
  },
  setItem: async (key, value) => {
    try {
      // If the value is too large, clean up old data
      const stringValue = JSON.stringify(value);
      if (stringValue.length > 2 * 1024 * 1024) { // If larger than 2MB
        await cleanupStorage();
      }

      await AsyncStorage.setItem(key, stringValue);
      return true;
    } catch (error) {
      if (error.message.includes('SQLITE_FULL')) {
        // If storage is full, try to clean up and retry
        await cleanupStorage();
        try {
          await AsyncStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (retryError) {
          console.log(`Error saving ${key} to storage after cleanup:`, retryError);
          return false;
        }
      }
      console.log(`Error saving ${key} to storage:`, error);
      return false;
    }
  },
};

// Cleanup function to remove old data
const cleanupStorage = async () => {
  try {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();

    // Remove old data if we have too many items
    if (keys.length > 100) {
      const keysToRemove = keys.slice(0, keys.length - 100);
      await AsyncStorage.multiRemove(keysToRemove);
    }

    // Clean up recently played if it's too large
    const recentlyPlayed = await safeStorage.getItem('recentlyPlayed', []);
    if (recentlyPlayed.length > 50) {
      await safeStorage.setItem('recentlyPlayed', recentlyPlayed.slice(-50));
    }

    // Clean up playlists if they're too large
    const playlists = await safeStorage.getItem('playlists', []);
    if (playlists.length > 20) {
      // Keep only the most recent 20 playlists
      const playlistsToKeep = playlists.slice(-20);
      await safeStorage.setItem('playlists', playlistsToKeep);
    }
  } catch (error) {
    console.log('Error during storage cleanup:', error);
  }
};

const AudioContext = createContext();

// Export the context itself
export { AudioContext };

export const useAudio = () => useContext(AudioContext);

const BATCH_SIZE = 100; // Process 100 tracks at a time for better performance
const INITIAL_LOAD_SIZE = 100; // Number of tracks to load initially

export const AudioProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [playlists, setPlaylists] = useState([
    { id: '1', name: 'Favorites', tracks: [], isSmart: true, smartType: 'favorites' },
    { id: '2', name: 'Recently Added', tracks: [], isSmart: true, smartType: 'recentlyAdded' },
    { id: '3', name: 'Most Played', tracks: [], isSmart: true, smartType: 'mostPlayed' },
  ]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRadioMode, setIsRadioMode] = useState(false);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: repeat all, 2: repeat one
  const [likedSongs, setLikedSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [audioFiles, setAudioFiles] = useState([]);
  const [albums, setAlbums] = useState({});
  const [trackPlayCounts, setTrackPlayCounts] = useState({});
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineTracks, setOfflineTracks] = useState([]);
  const [offlinePlaylists, setOfflinePlaylists] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [allTracks, setAllTracks] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const soundRef = useRef(null);
  const positionIntervalRef = useRef(null);
  const animatedAlbumRef = useRef(new Animated.Value(0)).current;
  const isRadioModeRef = useRef(isRadioMode); // Ref for radio mode
  const repeatModeRef = useRef(repeatMode);   // Ref for repeat mode
  const isShuffleRef = useRef(isShuffle);     // Ref for shuffle mode
  const currentPlaylistRef = useRef(currentPlaylist); // Ref for current playlist
  const currentIndexRef = useRef(currentIndex);   // Ref for current index

  // Keep refs updated with the latest state
  useEffect(() => {
    isRadioModeRef.current = isRadioMode;
  }, [isRadioMode]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  useEffect(() => {
    currentPlaylistRef.current = currentPlaylist;
  }, [currentPlaylist]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Load data from storage on mount
  useEffect(() => {
    const loadSavedData = async () => {
      // Using the safe wrapper with default values
      const savedPlaylists = await safeStorage.getItem('playlists', [
        { id: '1', name: 'Favorites', tracks: [] },
        { id: '2', name: 'Recently Added', tracks: [] },
      ]);
      const savedRecentlyPlayed = await safeStorage.getItem('recentlyPlayed', []);
      const savedLikedSongs = await safeStorage.getItem('likedSongs', []);

      setPlaylists(savedPlaylists);
      setRecentlyPlayed(savedRecentlyPlayed);
      setLikedSongs(savedLikedSongs);
    };

    loadSavedData();
  }, []);

  // Save data to storage when it changes - but don't block the UI
  useEffect(() => {
    const saveData = async () => {
      // Using the safe wrapper
      await safeStorage.setItem('playlists', playlists);
      await safeStorage.setItem('recentlyPlayed', recentlyPlayed);
      await safeStorage.setItem('likedSongs', likedSongs);
    };

    saveData();
  }, [playlists, recentlyPlayed, likedSongs]);

  // Load offline data on mount
  useEffect(() => {
    const loadOfflineData = async () => {
      const tracks = await OfflineStorage.getOfflineTracks();
      const offlinePlaylistsData = await OfflineStorage.getOfflinePlaylists();
      setOfflineTracks(tracks);
      setOfflinePlaylists(offlinePlaylistsData);
    };
    loadOfflineData();
  }, []);

  // Start album art rotation animation
  const startAlbumAnimation = useCallback(() => {
    Animated.loop(
      Animated.timing(animatedAlbumRef, {
        toValue: 1,
        duration: 30000, // 30 seconds for a full rotation
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, [animatedAlbumRef]);

  // Stop album art rotation animation
  const stopAlbumAnimation = useCallback(() => {
    Animated.timing(animatedAlbumRef).stop();
    // Reset to 0
    Animated.timing(animatedAlbumRef, {
      toValue: 0,
      duration: 0,
      useNativeDriver: true,
    }).start();
  }, [animatedAlbumRef]);

  // Cleanup sound object on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
      stopAlbumAnimation();
    };
  }, [startAlbumAnimation, stopAlbumAnimation]);

  // Track playback position
  const startPositionTracking = useCallback(() => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
    }

    positionIntervalRef.current = setInterval(async () => {
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            const position = status.positionMillis / 1000;
            const duration = status.durationMillis / 1000;

            setPlaybackPosition(position);
            setPlaybackDuration(duration);
          } else {
            // If the sound is not loaded, stop tracking
            console.warn('Sound is not loaded, stopping position tracking');
            stopPositionTracking();
          }
        } catch (error) {
          console.warn('Error getting playback status:', error.message);
          // If we get a "Player does not exist" error, stop tracking
          if (error.message.includes('Player does not exist')) {
            stopPositionTracking();
          }
        }
      } else {
        // If there's no sound reference, stop tracking
        console.warn('No sound reference, stopping position tracking');
        stopPositionTracking();
      }
    }, 500); // Update more frequently (every 500ms instead of 1000ms)
  }, [setPlaybackPosition, setPlaybackDuration, stopPositionTracking]);

  const stopPositionTracking = useCallback(() => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }
  }, []);

  // Update recently played tracks
  const updateRecentlyPlayed = useCallback((track) => {
    setRecentlyPlayed(prev => {
      // Remove the track if it already exists
      const filtered = prev.filter(t => t.id !== track.id);
      // Add the track to the beginning
      return [track, ...filtered].slice(0, 50); // Keep only the 50 most recent
    });
  }, []);

  // Update track play count
  const updateTrackPlayCount = useCallback((trackId) => {
    setTrackPlayCounts(prev => ({
      ...prev,
      [trackId]: (prev[trackId] || 0) + 1,
    }));
  }, []);

  // Get most played tracks
  const getMostPlayedTracks = useCallback(() => {
    return Object.entries(trackPlayCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([trackId]) => {
        // Find the track in audioFiles
        return audioFiles.find(track => track.id === trackId);
      })
      .filter(Boolean); // Remove any undefined tracks
  }, [trackPlayCounts, audioFiles]);

  // Update smart playlists
  const updateSmartPlaylists = useCallback(() => {
    setPlaylists(prevPlaylists =>
      prevPlaylists.map(playlist => {
        if (!playlist.isSmart) {
          return playlist;
        }

        switch (playlist.smartType) {
          case 'favorites':
            return {
              ...playlist,
              tracks: audioFiles.filter(track => isTrackLiked(track.id)),
            };
          case 'recentlyAdded':
            return {
              ...playlist,
              tracks: recentlyPlayed,
            };
          case 'mostPlayed':
            return {
              ...playlist,
              tracks: getMostPlayedTracks(),
            };
          default:
            return playlist;
        }
      })
    );
  }, [audioFiles, recentlyPlayed, isTrackLiked, getMostPlayedTracks]);

  // Update smart playlists when relevant data changes
  useEffect(() => {
    updateSmartPlaylists();
  }, [audioFiles, recentlyPlayed, isTrackLiked, getMostPlayedTracks, updateSmartPlaylists]);

  // Toggle offline mode
  const toggleOfflineMode = () => {
    setIsOfflineMode(prev => !prev);
  };

  // Save track for offline playback
  const saveTrackOffline = async (track) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const success = await OfflineStorage.saveTrackOffline(track);

      if (success) {
        const tracks = await OfflineStorage.getOfflineTracks();
        setOfflineTracks(tracks);
      }

      setIsDownloading(false);
      setDownloadProgress(100);
      return success;
    } catch (error) {
      console.error('Error saving track offline:', error);
      setIsDownloading(false);
      setDownloadProgress(0);
      return false;
    }
  };

  // Save playlist for offline playback
  const savePlaylistOffline = async (playlist) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      const success = await OfflineStorage.savePlaylistOffline(playlist);

      if (success) {
        const offlinePlaylistsData = await OfflineStorage.getOfflinePlaylists();
        setOfflinePlaylists(offlinePlaylistsData);
      }

      setIsDownloading(false);
      setDownloadProgress(100);
      return success;
    } catch (error) {
      console.error('Error saving playlist offline:', error);
      setIsDownloading(false);
      setDownloadProgress(0);
      return false;
    }
  };

  // Remove track from offline storage
  const removeOfflineTrack = async (trackId) => {
    try {
      const success = await OfflineStorage.removeOfflineTrack(trackId);

      if (success) {
        const tracks = await OfflineStorage.getOfflineTracks();
        setOfflineTracks(tracks);
      }

      return success;
    } catch (error) {
      console.error('Error removing offline track:', error);
      return false;
    }
  };

  // Remove playlist from offline storage
  const removeOfflinePlaylist = async (playlistId) => {
    try {
      const success = await OfflineStorage.removeOfflinePlaylist(playlistId);

      if (success) {
        const offlinePlaylistsData = await OfflineStorage.getOfflinePlaylists();
        setOfflinePlaylists(offlinePlaylistsData);
      }

      return success;
    } catch (error) {
      console.error('Error removing offline playlist:', error);
      return false;
    }
  };

  // Clear all offline data
  const clearOfflineStorage = async () => {
    try {
      const success = await OfflineStorage.clearOfflineStorage();

      if (success) {
        setOfflineTracks([]);
        setOfflinePlaylists([]);
      }

      return success;
    } catch (error) {
      console.error('Error clearing offline storage:', error);
      return false;
    }
  };

  // Get offline storage usage
  const getOfflineStorageUsage = async () => {
    return await OfflineStorage.getOfflineStorageUsage();
  };

  // Load initial batch of tracks
  useEffect(() => {
    const loadInitialTracks = async () => {
      try {
        // Start loading all tracks with progress tracking
        const tracks = await getSongsAsync((progress) => {
          setLoadingProgress(progress * 0.7); // First 70% of progress is loading
        });

        if (tracks.length === 0) {
          setHasMore(false);
          return;
        }

        // Process all tracks in parallel batches for better performance
        const batches = [];
        for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
          batches.push(tracks.slice(i, i + BATCH_SIZE));
        }

        // Process batches in parallel with progress tracking
        let processedCount = 0;
        const processedBatches = await Promise.all(
          batches.map(async (batch, index) => {
            const processed = await processTracksBatch(batch);
            processedCount += batch.length;
            setLoadingProgress(0.7 + (processedCount / tracks.length) * 0.3); // Last 30% of progress
            return processed;
          })
        );

        // Combine all processed tracks
        const processedTracks = processedBatches.flat();

        // Update state with all tracks
        setAudioFiles(processedTracks);
        setAllTracks(tracks);
        setHasMore(false); // No more tracks to load since we loaded all
        setLoadingProgress(1);
      } catch (error) {
        console.error('Error loading initial tracks:', error);
      }
    };

    loadInitialTracks();
  }, []);

  // Process a batch of tracks
  const processTracksBatch = async (tracks) => {
    return tracks.map(track => ({
      ...track,
      placeholderLetter: (track.title || 'M').charAt(0).toUpperCase(),
      placeholderColor: generateColorFromString(track.artist || track.album || track.title || 'M'),
    }));
  };

  // Load more tracks
  const loadMoreTracks = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const start = currentBatch * BATCH_SIZE + INITIAL_LOAD_SIZE;
      const end = start + BATCH_SIZE;
      const nextBatch = allTracks.slice(start, end);

      if (nextBatch.length === 0) {
        setHasMore(false);
        return;
      }

      const processedBatch = await processTracksBatch(nextBatch);
      setAudioFiles(prev => [...prev, ...processedBatch]);
      setCurrentBatch(prev => prev + 1);
      setHasMore(end < allTracks.length);
    } catch (error) {
      console.error('Error loading more tracks:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentBatch, allTracks, isLoadingMore, hasMore]);

  // Modified playTrack function to handle offline playback
  const playTrack = useCallback(async (track, playlist = null, index = 0) => {
    try {
      setIsLoading(true);

      // Unload current sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Check if track is available offline
      const isOffline = await OfflineStorage.isTrackOffline(track.id);

      // Load sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: isOffline ? track.uri : track.uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setCurrentTrack(track);
      setCurrentPlaylist(playlist || [track]);
      setCurrentIndex(index);
      setIsPlaying(true);
      startPositionTracking();
      startAlbumAnimation();

      // Update recently played
      updateRecentlyPlayed(track);
      updateTrackPlayCount(track.id);

      setIsLoading(false);
    } catch (error) {
      console.error('Error playing track:', error);
      setIsLoading(false);
    }
  }, [startPositionTracking, startAlbumAnimation, updateRecentlyPlayed, updateTrackPlayCount, onPlaybackStatusUpdate]);

  const onPlaybackStatusUpdate = useCallback((status) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        // Use refs to access the latest state values inside the callback
        const currentRepeatMode = repeatModeRef.current;
        const currentIsRadioMode = isRadioModeRef.current;
        const currentIsShuffle = isShuffleRef.current;
        const playlist = currentPlaylistRef.current;
        const index = currentIndexRef.current;

        console.log(
          'Track finished. Repeat:', currentRepeatMode,
          'Shuffle:', currentIsShuffle,
          'Radio:', currentIsRadioMode
        );

        if (currentRepeatMode === 2) {
          // Repeat One: Replay the current track
          console.log('Repeat One: Replaying current track');
          if (soundRef.current) {
            soundRef.current.setPositionAsync(0).then(() => {
              soundRef.current.playAsync();
            }).catch(e => console.error('Error seeking to 0 for repeat:', e));
          } else {
            playTrack(currentTrack, playlist, index); // Use playlist/index from ref
          }
        } else if (currentRepeatMode === 1 || (currentIsRadioMode && currentRepeatMode !== 2)) {
          // Repeat Playlist or Radio Mode
          console.log('Repeat Playlist or Radio Mode: Playing next track');
          handleNext();
        } else {
          // Repeat Off and Not Radio Mode
          console.log('Repeat Off & Not Radio: Checking for next track');
          if (!currentIsShuffle && index < playlist.length - 1) {
            console.log('Playing next sequential track');
            handleNext();
          } else {
            // End of sequential playlist or shuffle w/ repeat off
            console.log('End of playlist (or shuffle w/ repeat off), stopping playback.');
            setIsPlaying(false);
            stopPositionTracking();
            stopAlbumAnimation();
          }
        }
      } else {
        // Update playback position and duration while playing
        if (status.isPlaying) {
          const position = status.positionMillis / 1000;
          const duration = status.durationMillis / 1000;
          setPlaybackPosition(position);
          // Update duration only if it's valid and different
          if (duration && duration > 0 && duration !== playbackDuration) {
             setPlaybackDuration(duration);
          }
        }
      }
    } else {
      // Handle errors or unexpected unload
      if (status.error) {
        console.error(`Playback Error: ${status.error}`);
        // Optionally try to handle the error, e.g., skip track
        // handleNext();
      }
      // If playback stalls or buffer is empty
      if (isPlaying && !status.isPlaying && !status.isBuffering) {
         // Maybe playback was interrupted? Decide if action needed
      }
    }
  }, [currentTrack, handleNext, isPlaying, playbackDuration, playTrack, setPlaybackDuration, setPlaybackPosition, setIsPlaying, stopAlbumAnimation, stopPositionTracking]);

  const togglePlayPause = async () => {
    if (!soundRef.current) {
      console.warn('No sound object available for play/pause');
      return;
    }

    try {
      if (isPlaying) {
        try {
          await soundRef.current.pauseAsync();
          stopPositionTracking();
          stopAlbumAnimation();
          setIsPlaying(false);
        } catch (pauseError) {
          console.warn('Error pausing sound:', pauseError.message);
          // If we get a "Player does not exist" error, reset the state
          if (pauseError.message.includes('Player does not exist')) {
            soundRef.current = null;
            setIsPlaying(false);
          }
        }
      } else {
        try {
          await soundRef.current.playAsync();
          startPositionTracking();
          startAlbumAnimation();
          setIsPlaying(true);
        } catch (playError) {
          console.warn('Error playing sound:', playError.message);
          // If we get a "Player does not exist" error, reset the state
          if (playError.message.includes('Player does not exist')) {
            soundRef.current = null;
            setIsPlaying(false);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error.message);
      // Reset state on error
      soundRef.current = null;
      setIsPlaying(false);
    }
  };

  const handleNext = useCallback(async () => {
    // Use refs to get the latest state
    const playlist = currentPlaylistRef.current;
    const currentIdx = currentIndexRef.current; // Index within the *current playlist* if applicable
    const shuffle = isShuffleRef.current;
    const radio = isRadioModeRef.current;
    const currentTrackId = currentTrack?.id; // Get ID of the currently playing track

    if (radio) {
      // RADIO MODE: Select random track from *all* audioFiles
      if (audioFiles && audioFiles.length > 0) {
        let randomFileIndex;
        let nextTrack;

        // Prevent picking the same track unless it's the only one available
        if (audioFiles.length <= 1) {
          randomFileIndex = 0;
          nextTrack = audioFiles[0];
        } else {
          do {
            randomFileIndex = Math.floor(Math.random() * audioFiles.length);
            nextTrack = audioFiles[randomFileIndex];
          } while (nextTrack.id === currentTrackId);
        }

        if (nextTrack) {
          console.log(`handleNext (Radio Mode): Playing track ${randomFileIndex} ('${nextTrack.title}') from entire library (${audioFiles.length} tracks)`);
          // When playing in radio mode, the "playlist" context is the entire library
          // The "index" is the index within audioFiles
          await playTrack(nextTrack, audioFiles, randomFileIndex);
        } else {
           console.log('handleNext (Radio Mode): Could not find a valid next track.');
           // Stop playback if no valid next track is found
           setIsPlaying(false);
           stopPositionTracking();
           stopAlbumAnimation();
        }
      } else {
        console.log('handleNext (Radio Mode) called, but audioFiles is empty.');
        // Stop playback if library is empty
        setIsPlaying(false);
        stopPositionTracking();
        stopAlbumAnimation();
      }
    } else {
      // SHUFFLE/SEQUENTIAL MODE (within current playlist)
      if (playlist && playlist.length > 0) {
        let nextIndex;

        if (shuffle) {
          // Shuffle within the playlist
          let randomIndex;
          // Prevent picking the same index within the playlist
          if (playlist.length <= 1) {
             randomIndex = 0;
          } else {
             do {
               randomIndex = Math.floor(Math.random() * playlist.length);
             } while (randomIndex === currentIdx);
          }
          nextIndex = randomIndex;
        } else {
          // Sequential within the playlist
          nextIndex = (currentIdx + 1) % playlist.length;
        }

        console.log(`handleNext (Playlist Mode): Playing track at index ${nextIndex} from playlist of length ${playlist.length}`);
        await playTrack(playlist[nextIndex], playlist, nextIndex);
      } else {
        console.log('handleNext (Playlist Mode) called, but currentPlaylistRef.current is empty or undefined.');
        // Playlist finished or empty, stop playback
        setIsPlaying(false);
        stopPositionTracking();
        stopAlbumAnimation();
      }
    }
  }, [audioFiles, currentTrack, playTrack, setIsPlaying, stopAlbumAnimation, stopPositionTracking]);

  const handlePrevious = async () => {
    // Use refs to get the latest state
    const playlist = currentPlaylistRef.current;
    const currentIdx = currentIndexRef.current; // Index within the *current playlist* if applicable
    const shuffle = isShuffleRef.current;
    const radio = isRadioModeRef.current;
    const currentTrackId = currentTrack?.id;

    if (radio) {
      // RADIO MODE: Select random track from *all* audioFiles (same as next in this mode)
      if (audioFiles && audioFiles.length > 0) {
        let randomFileIndex;
        let prevTrack; // Renamed for clarity, but logic is the same as next

        if (audioFiles.length <= 1) {
          randomFileIndex = 0;
          prevTrack = audioFiles[0];
        } else {
          do {
            randomFileIndex = Math.floor(Math.random() * audioFiles.length);
            prevTrack = audioFiles[randomFileIndex];
          } while (prevTrack.id === currentTrackId);
        }

        if (prevTrack) {
          console.log(`handlePrevious (Radio Mode): Playing track ${randomFileIndex} ('${prevTrack.title}') from entire library (${audioFiles.length} tracks)`);
          await playTrack(prevTrack, audioFiles, randomFileIndex);
        } else {
           console.log('handlePrevious (Radio Mode): Could not find a valid track.');
           setIsPlaying(false);
           stopPositionTracking();
           stopAlbumAnimation();
        }
      } else {
        console.log('handlePrevious (Radio Mode) called, but audioFiles is empty.');
        setIsPlaying(false);
        stopPositionTracking();
        stopAlbumAnimation();
      }
    } else {
      // SHUFFLE/SEQUENTIAL MODE (within current playlist)
      if (playlist && playlist.length > 0) {
        // If we're past 3 seconds into the song, restart it instead of going to previous
        if (playbackPosition > 3 && !shuffle) { // Don't restart if shuffle is on
          if (soundRef.current) {
            try {
              await soundRef.current.setPositionAsync(0);
              setPlaybackPosition(0);
              console.log('handlePrevious (Playlist Mode): Restarting track.');
            } catch (error) {
              console.log('Error resetting position:', error);
            }
          }
          return;
        }

        let prevIndex;

        if (shuffle) {
          // Get random index from playlist that is not the current one
          let randomIndex;
          if (playlist.length <= 1) {
              randomIndex = 0;
          } else {
             do {
               randomIndex = Math.floor(Math.random() * playlist.length);
             } while (randomIndex === currentIdx);
          }
          prevIndex = randomIndex;
        } else {
          // Normal sequential playback within playlist
          prevIndex = (currentIdx - 1 + playlist.length) % playlist.length;
        }

        console.log(`handlePrevious (Playlist Mode): Playing track at index ${prevIndex} from playlist of length ${playlist.length}`);
        await playTrack(playlist[prevIndex], playlist, prevIndex);
      } else {
         console.log('handlePrevious (Playlist Mode) called, but currentPlaylistRef.current is empty or undefined.');
         // No playlist, nothing to do
      }
    }
  };

  const seekTo = async (seconds) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setPositionAsync(seconds * 1000);
        setPlaybackPosition(seconds);
      } catch (error) {
        console.log('Error seeking:', error);
      }
    }
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
    // Decoupled: No longer automatically enables radio mode
    // if (!isShuffle) {
    //   setIsRadioMode(true);
    // }
  };

  const toggleRadioMode = () => {
    console.log('Toggling Radio Mode. Current state:', isRadioMode);
    setIsRadioMode(prev => {
      console.log('New Radio Mode state:', !prev);
      return !prev;
    });
    // Decoupled: No longer automatically enables shuffle mode
  };

  const toggleRepeat = () => {
    setRepeatMode(prev => (prev + 1) % 3);
  };

  const toggleLike = (trackId) => {
    // Update liked songs list
    setLikedSongs(prev => {
      const isLiked = prev.includes(trackId);
      if (isLiked) {
        return prev.filter(id => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });

    // Find the track in the current playlist or audio files
    const track = currentPlaylist.find(t => t.id === trackId) ||
                 audioFiles.find(t => t.id === trackId);

    if (track) {
      // Find the Favorites playlist
      const favoritesPlaylist = playlists.find(p => p.name === 'Favorites');

      if (favoritesPlaylist) {
        // Check if track is already in favorites
        const isInFavorites = favoritesPlaylist.tracks.some(t => t.id === trackId);

        if (isInFavorites) {
          // Remove from favorites
          removeFromPlaylist(favoritesPlaylist.id, trackId);
        } else {
          // Add to favorites
          addToPlaylist(favoritesPlaylist.id, track);
        }
      }
    }
  };

  const isTrackLiked = useCallback((trackId) => {
    return likedSongs.includes(trackId);
  }, [likedSongs]);

  const addToPlaylist = (playlistId, track) => {
    setPlaylists(prevPlaylists =>
      prevPlaylists.map(playlist => {
        // Check if track already exists in playlist
        if (playlist.id === playlistId) {
          const trackExists = playlist.tracks.some(t => t.id === track.id);
          if (!trackExists) {
            // Make sure to preserve all track properties including artwork
            return {
              ...playlist,
              tracks: [...playlist.tracks, { ...track }],
            };
          }
        }
        return playlist;
      })
    );
  };

  const removeFromPlaylist = (playlistId, trackId) => {
    setPlaylists(prevPlaylists =>
      prevPlaylists.map(playlist =>
        playlist.id === playlistId
          ? { ...playlist, tracks: playlist.tracks.filter(track => track.id !== trackId) }
          : playlist
      )
    );
  };

  const createPlaylist = (name) => {
    const newPlaylist = {
      id: Date.now().toString(),
      name,
      tracks: [],
    };

    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist.id;
  };

  // Create a smart playlist
  const createSmartPlaylist = (name, smartType) => {
    const newPlaylist = {
      id: Date.now().toString(),
      name,
      tracks: [],
      isSmart: true,
      smartType,
    };

    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist.id;
  };

  // Define missing playlist functions
  const deletePlaylist = (playlistId) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    // Optionally reset currentPlaylist if the deleted one was active
    if (currentPlaylist?.id === playlistId) {
      setCurrentPlaylist([]);
      setCurrentIndex(0);
      setCurrentTrack(null);
      // Consider stopping playback if needed
    }
  };

  const renamePlaylist = (playlistId, newName) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId ? { ...p, name: newName } : p
    ));
  };

  const reorderPlaylistTrack = (playlistId, fromIndex, toIndex) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const tracks = [...p.tracks];
        const [movedTrack] = tracks.splice(fromIndex, 1);
        tracks.splice(toIndex, 0, movedTrack);
        return { ...p, tracks };
      }
      return p;
    }));
    // Adjust currentIndex if the currently playing playlist was reordered
    if (currentPlaylist?.id === playlistId) {
        // Simple approach: if the moved track was the current one, update index
        if (currentIndex === fromIndex) {
           setCurrentIndex(toIndex);
        } else if (currentIndex > fromIndex && currentIndex <= toIndex) {
           setCurrentIndex(currentIndex - 1);
        } else if (currentIndex < fromIndex && currentIndex >= toIndex) {
           setCurrentIndex(currentIndex + 1);
        }
    }
  };

  // New playlist management functions
  const duplicatePlaylist = (playlistId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      const newPlaylist = {
        id: Date.now().toString(),
        name: `${playlist.name} (Copy)`,
        tracks: [...playlist.tracks],
        createdAt: new Date().toISOString(),
        description: playlist.description || '',
        isPrivate: playlist.isPrivate || false,
      };
      setPlaylists(prev => [...prev, newPlaylist]);
      return newPlaylist.id;
    }
    return null;
  };

  const updatePlaylistDetails = (playlistId, { name, description, isPrivate }) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId
        ? {
            ...p,
            name: name || p.name,
            description: description !== undefined ? description : p.description,
            isPrivate: isPrivate !== undefined ? isPrivate : p.isPrivate,
            updatedAt: new Date().toISOString(),
          }
        : p
    ));
  };

  const clearPlaylist = (playlistId) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId ? { ...p, tracks: [] } : p
    ));
    // If this was the current playlist, stop playback
    if (currentPlaylist?.id === playlistId) {
      setCurrentPlaylist([]);
      setCurrentIndex(0);
      setCurrentTrack(null);
      if (soundRef.current) {
        soundRef.current.stopAsync();
      }
    }
  };

  const getPlaylistById = (playlistId) => {
    return playlists.find(p => p.id === playlistId);
  };

  const getPlaylistStats = (playlistId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
      return null;
    }

    const totalDuration = playlist.tracks.reduce((acc, track) => acc + (track.duration || 0), 0);
    const uniqueArtists = new Set(playlist.tracks.map(track => track.artist)).size;
    const uniqueAlbums = new Set(playlist.tracks.map(track => track.album)).size;

    return {
      trackCount: playlist.tracks.length,
      totalDuration,
      uniqueArtists,
      uniqueAlbums,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    };
  };

  // Group songs by album
  const groupSongsByAlbum = useCallback((songs) => {
    const albumGroups = {};
    songs.forEach(song => {
      const albumName = song.album || 'Unknown Album';
      const artistName = song.artist || 'Unknown Artist';

      if (!albumGroups[albumName]) {
        albumGroups[albumName] = {
          name: albumName,
          artist: artistName,
          artwork: song.artwork,
          tracks: [],
          trackCount: 0,
        };
      }

      albumGroups[albumName].tracks.push(song);
      albumGroups[albumName].trackCount = albumGroups[albumName].tracks.length;
    });

    return albumGroups;
  }, []);

  // Update albums when audioFiles change
  useEffect(() => {
    const groupedAlbums = groupSongsByAlbum(audioFiles);
    setAlbums(groupedAlbums);
  }, [audioFiles, groupSongsByAlbum]);

  // Get all albums
  const getAllAlbums = useCallback(() => {
    return Object.values(albums);
  }, [albums]);

  // Get album by name
  const getAlbumByName = useCallback((albumName) => {
    return albums[albumName];
  }, [albums]);

  // Play album
  const playAlbum = useCallback(async (albumName, startIndex = 0) => {
    const album = albums[albumName];
    if (!album || !album.tracks.length) {
      return;
    }

    setCurrentPlaylist(album.tracks);
    setCurrentIndex(startIndex);
    await playTrack(album.tracks[startIndex], album.tracks, startIndex);
  }, [albums, playTrack]);

  // Shuffle album
  const shuffleAlbum = useCallback(async (albumName) => {
    const album = albums[albumName];
    if (!album || !album.tracks.length) {
      return;
    }

    const shuffledTracks = [...album.tracks].sort(() => Math.random() - 0.5);
    setCurrentPlaylist(shuffledTracks);
    setCurrentIndex(0);
    await playTrack(shuffledTracks[0], shuffledTracks, 0);
  }, [albums, playTrack]);

  // Define the context value based on internal state and functions
  const contextValue = {
    currentTrack,
    setCurrentTrack, // Make sure to expose setters if needed elsewhere
    isPlaying,
    setIsPlaying,
    currentIndex,
    setCurrentIndex,
    currentPlaylist,
    setCurrentPlaylist,
    playlists,
    setPlaylists,
    recentlyPlayed,
    setRecentlyPlayed,
    playbackPosition,
    setPlaybackPosition,
    playbackDuration,
    setPlaybackDuration,
    isShuffle,
    setIsShuffle,
    isRadioMode,
    setIsRadioMode,
    repeatMode,
    setRepeatMode,
    likedSongs,
    setLikedSongs,
    isLoading,
    setIsLoading,
    audioFiles,
    setAudioFiles, // Keep this setter in case you need to update the list later
    soundRef,
    animatedAlbumRef,
    albums,
    getAllAlbums,
    getAlbumByName,
    playAlbum,
    shuffleAlbum,

    // Expose functions
    startAlbumAnimation,
    stopAlbumAnimation,
    startPositionTracking,
    stopPositionTracking,
    updateRecentlyPlayed,
    updateTrackPlayCount,
    playTrack,
    onPlaybackStatusUpdate,
    togglePlayPause,
    handleNext,
    handlePrevious,
    seekTo,
    toggleShuffle,
    toggleRadioMode,
    toggleRepeat,
    toggleLike,
    isTrackLiked,
    addToPlaylist,
    removeFromPlaylist,
    createPlaylist,
    createSmartPlaylist,
    deletePlaylist,
    renamePlaylist,
    reorderPlaylistTrack,
    duplicatePlaylist,
    updatePlaylistDetails,
    clearPlaylist,
    getPlaylistById,
    getPlaylistStats,
    updateSmartPlaylists,
    getMostPlayedTracks,
    isOfflineMode,
    offlineTracks,
    offlinePlaylists,
    isDownloading,
    downloadProgress,
    toggleOfflineMode,
    saveTrackOffline,
    savePlaylistOffline,
    removeOfflineTrack,
    removeOfflinePlaylist,
    clearOfflineStorage,
    getOfflineStorageUsage,
    loadMoreTracks,
    isLoadingMore,
    hasMore,
    loadingProgress,
  };

  // Always provide the internal contextValue
  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};
