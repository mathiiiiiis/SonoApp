import * as MediaLibrary from 'expo-media-library';
import { getAlbumArtwork } from './artworkHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const parseMetadata = (filename) => {
  const name = filename.replace(/\.[^/.]+$/, '');

  const patterns = [
    /^(?:\d+\.\s*)?([^-]+)\s*-\s*(.+)$/, // Artist - Title
    /^(?:\d+\s*-\s*)?([^-]+)\s*-\s*(.+)$/, // 01 - Artist - Title
    /^(.+)$/,// Just title
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      if (match.length === 3) {
        return {
          artist: match[1].trim(),
          title: match[2].trim(),
        };
      } else if (match.length === 2) {
        return {
          title: match[1].trim(),
          artist: 'Unknown Artist',
        };
      }
    }
  }

  return { title: name, artist: 'Unknown Artist' };
};

const getAssetInfo = async (asset) => {
  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset.id, {
      shouldDownloadFromNetwork: true,
    });
    return info;
  } catch (error) {
    console.log('Error getting asset info:', error);
    return null;
  }
};

// Add cache management
const CACHE_KEY = '@MusicPlayer:library_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const getCachedLibrary = async () => {
  try {
    // Get metadata first
    const metadata = await AsyncStorage.getItem(`${CACHE_KEY}_metadata`);
    if (!metadata) {
      return null;
    }

    const { timestamp, totalChunks } = JSON.parse(metadata);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      return null;
    }

    // Retrieve and combine all chunks
    const chunks = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunk = await AsyncStorage.getItem(`${CACHE_KEY}_chunk_${i}`);
      if (chunk) {
        const { data } = JSON.parse(chunk);
        chunks.push(...data);
      }
    }

    return chunks.length > 0 ? chunks : null;
  } catch (error) {
    console.warn('Error reading cache:', error);
    return null;
  }
};

const setCachedLibrary = async (data) => {
  try {
    // Process the data to ensure artwork is stored efficiently
    const processedData = data.map(track => ({
      ...track,
      artwork: track.artwork ? (
        typeof track.artwork === 'string'
          ? track.artwork
          : track.artwork?.uri || null
      ) : null,
    }));

    // Split the data into chunks if it's too large
    const chunkSize = 100; // Process 100 tracks at a time
    const chunks = [];
    for (let i = 0; i < processedData.length; i += chunkSize) {
      chunks.push(processedData.slice(i, i + chunkSize));
    }

    // Store each chunk separately
    for (let i = 0; i < chunks.length; i++) {
      await AsyncStorage.setItem(
        `${CACHE_KEY}_chunk_${i}`,
        JSON.stringify({
          data: chunks[i],
          timestamp: Date.now(),
          chunkIndex: i,
          totalChunks: chunks.length,
        })
      );
    }

    // Store metadata about the chunks
    await AsyncStorage.setItem(
      `${CACHE_KEY}_metadata`,
      JSON.stringify({
        timestamp: Date.now(),
        totalChunks: chunks.length,
      })
    );
  } catch (error) {
    console.warn('Error writing cache:', error);
  }
};

export const getSongsAsync = async (progressCallback) => {
  try {
    console.log('Starting to fetch audio files...');

    // Try to get cached library first
    const cachedLibrary = await getCachedLibrary();
    if (cachedLibrary) {
      console.log('Using cached library');
      if (progressCallback) {
        progressCallback(1.0);
      }
      return cachedLibrary;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    console.log('Media Library permission status:', status);

    if (status !== 'granted') {
      console.log('Permission not granted for media library');
      return [];
    }

    // Update progress - permission granted
    if (progressCallback) {
      progressCallback(0.1);
    }
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 10000,
      include: ['filename', 'mediaType', 'duration', 'albumId', 'uri'],
    });

    console.log(`Found ${assets.length} audio files in media library`);

    // Update progress - assets retrieved
    if (progressCallback) {
      progressCallback(0.2);
    }

    if (assets.length === 0) {
      console.log('No audio files found in media library');
      if (progressCallback) {
        progressCallback(1.0);
      }
      return [];
    }

    const processedTracks = [];
    const totalTracks = assets.length;
    const BATCH_SIZE = 20; // Process tracks in batches of 20

    // Process tracks in batches
    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      const batch = assets.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (track) => {
        try {
          const assetInfo = await getAssetInfo(track);
          const parsedInfo = parseMetadata(track.filename);

          // Extract artwork from the track
          let artwork = null;
          try {
            // First try to get artwork from the asset info
            if (assetInfo && assetInfo.albumId) {
              const album = await MediaLibrary.getAlbumAsync(assetInfo.albumId);
              if (album && album.coverImage) {
                artwork = album.coverImage;
              }
            }
                        // If no artwork found, try to extract it from the audio file
            if (!artwork) {
              artwork = await getAlbumArtwork(track.uri);
            }

            // If artwork is found, ensure it's in the correct format
            if (artwork) {
              if (typeof artwork !== 'string' && !artwork.uri) {
                artwork = { uri: artwork };
              }
            }
          } catch (artworkError) {
            console.warn(`Error extracting artwork for ${track.filename}:`, artworkError);
          }

          // Create track object with required fields
          return {
            id: track.id,
            uri: track.uri,
            title: parsedInfo.title || track.filename,
            artist: parsedInfo.artist || 'Unknown Artist',
            duration: track.duration || 0,
            filename: track.filename,
            albumId: track.albumId,
            artwork: artwork,
          };
        } catch (error) {
          console.warn(`Error processing track ${track.filename}:`, error);
          return null;
        }
      });

      // Wait for all tracks in the batch to be processed
      const batchResults = await Promise.all(batchPromises);
      processedTracks.push(...batchResults.filter(track => track !== null));

      // Update progress periodically - processing tracks (20% to 70% range)
      if (progressCallback) {
        const progressValue = 0.2 + (0.5 * (i / totalTracks));
        progressCallback(progressValue);
      }
    }

    console.log(`Successfully processed ${processedTracks.length} out of ${assets.length} tracks`);

    // Cache the processed library
    await setCachedLibrary(processedTracks);

    // Update progress - processing complete
    if (progressCallback) {
      progressCallback(1.0);
    }
    return processedTracks;
  } catch (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
};

export const requestPermissionsAsync = async () => {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync();
    return permission;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return { granted: false };
  }
};
