import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { getAudioMetadata } from './metadataHelper';
import { openDatabase, deleteDatabase } from 'expo-sqlite';
import { base64Encode } from './encodingHelper';
import { getAlbumArtwork } from './artworkHelper';
import { parseMetadata } from './mediaLibrary';

// Cache directory for artwork
const CACHE_DIR = FileSystem.cacheDirectory + 'artwork_cache/';
const DB_NAME = 'artwork_cache.db';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB max cache size
const MAX_ENTRIES = 1000; // Maximum number of entries to keep

let db = null;

const initDatabase = async () => {
  try {
    // Ensure cache directory exists
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }

    // Open database
    db = openDatabase(DB_NAME);

    // Create table if it doesn't exist
    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS artwork_cache (
            uri TEXT PRIMARY KEY,
            artwork TEXT,
            timestamp INTEGER,
            size INTEGER
          )`,
          [],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });

    // Clean up old entries if needed
    await cleanupCache();
  } catch (error) {
    console.error('Error initializing database:', error);
    // If database is corrupted, try to recreate it
    await resetDatabase();
  }
};

const cleanupCache = async () => {
  try {
    await ensureCacheDir();

    // Get all cache files
    const cacheFiles = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const fileDetails = [];

    // Get details for all files
    for (const file of cacheFiles) {
      try {
        const filePath = CACHE_DIR + file;
        const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          const data = JSON.parse(content);
          fileDetails.push({
            path: filePath,
            size: fileInfo.size,
            timestamp: data.timestamp || 0,
          });
        }
      } catch (error) {
        console.warn(`Error processing cache file ${file}:`, error);
      }
    }

    // Sort by timestamp (oldest first)
    fileDetails.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate total size
    let totalSize = fileDetails.reduce((sum, file) => sum + file.size, 0);

    // Remove oldest files if we exceed size limit
    while (totalSize > MAX_CACHE_SIZE && fileDetails.length > 0) {
      const oldestFile = fileDetails.shift();
      try {
        await FileSystem.deleteAsync(oldestFile.path, { idempotent: true });
        totalSize -= oldestFile.size;
      } catch (error) {
        console.warn(`Error deleting cache file ${oldestFile.path}:`, error);
      }
    }

    // Remove excess entries if we have too many
    while (fileDetails.length > MAX_ENTRIES) {
      const oldestFile = fileDetails.shift();
      try {
        await FileSystem.deleteAsync(oldestFile.path, { idempotent: true });
      } catch (error) {
        console.warn(`Error deleting cache file ${oldestFile.path}:`, error);
      }
    }
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
};

const resetDatabase = async () => {
  try {
    // Close existing database
    if (db) {
      await new Promise((resolve) => {
        db.transaction(tx => {
          tx.executeSql('PRAGMA wal_checkpoint(FULL)', [], () => resolve());
        });
      });
    }

    // Delete the database file
    await deleteDatabase(DB_NAME);

    // Reinitialize the database
    await initDatabase();
  } catch (error) {
    console.error('Error resetting database:', error);
  }
};

// Ensure cache directory exists
const ensureCacheDir = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error ensuring cache directory:', error);
  }
};

/**
 * Get a cached artwork by URI
 * @param {string} uri - The URI of the audio file
 * @returns {Promise<string|null>} - A promise that resolves to the cached artwork data URL or null
 */
export const getCachedArtwork = async (uri) => {
  if (!uri) {
    return null;
  }

  try {
    await ensureCacheDir();

    // Create a cache key from the URI using base64 encoding
    const cacheKey = base64Encode(uri).replace(/[^a-zA-Z0-9]/g, '_');
    const cachePath = CACHE_DIR + cacheKey + '.json';

    // Check if cache file exists
    const cacheInfo = await FileSystem.getInfoAsync(cachePath);
    if (!cacheInfo.exists) {
      return null;
    }

    // Read cache file
    const cacheContent = await FileSystem.readAsStringAsync(cachePath);
    const cacheData = JSON.parse(cacheContent);

    // Update timestamp to keep frequently accessed items in cache
    cacheData.timestamp = Date.now();
    await FileSystem.writeAsStringAsync(cachePath, JSON.stringify(cacheData));

    return cacheData.artwork;
  } catch (error) {
    console.error(`Error getting cached artwork for ${uri}:`, error);
    return null;
  }
};

/**
 * Cache artwork for a URI
 * @param {string} uri - The URI of the audio file
 * @param {string} artwork - The artwork data URL
 * @returns {Promise<boolean>} - A promise that resolves to true if caching was successful
 */
export const cacheArtwork = async (uri, artwork) => {
  if (!uri || !artwork) {
    return false;
  }

  try {
    await ensureCacheDir();

    // Create a cache key from the URI using base64 encoding
    const cacheKey = base64Encode(uri).replace(/[^a-zA-Z0-9]/g, '_');
    const cachePath = CACHE_DIR + cacheKey + '.json';

    // Write cache file
    const cacheData = {
      uri,
      artwork,
      timestamp: Date.now(),
    };

    await FileSystem.writeAsStringAsync(cachePath, JSON.stringify(cacheData));

    // Clean up cache if needed
    await cleanupCache();

    return true;
  } catch (error) {
    console.error(`Error caching artwork for ${uri}:`, error);
    return false;
  }
};

/**
 * Clear the artwork cache
 * @returns {Promise<boolean>} - A promise that resolves to true if clearing was successful
 */
export const clearCache = async () => {
  try {
    await ensureCacheDir();

    // Get all cache files
    const cacheFiles = await FileSystem.readDirectoryAsync(CACHE_DIR);

    // Delete all cache files
    for (const file of cacheFiles) {
      try {
        const filePath = CACHE_DIR + file;
        await FileSystem.deleteAsync(filePath, { idempotent: true });
      } catch (error) {
        console.warn(`Error deleting cache file ${file}:`, error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Get the size of the artwork cache
 * @returns {Promise<number>} - A promise that resolves to the cache size in bytes
 */
export const getArtworkCacheSize = async () => {
  try {
    await ensureCacheDir();

    // Get all cache files
    const cacheFiles = await FileSystem.readDirectoryAsync(CACHE_DIR);
    let totalSize = 0;

    // Calculate total size
    for (const file of cacheFiles) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(CACHE_DIR + file, { size: true });
        if (fileInfo.exists) {
          totalSize += fileInfo.size || 0;
        }
      } catch (error) {
        console.warn(`Error getting size for cache file ${file}:`, error);
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error getting artwork cache size:', error);
    return 0;
  }
};

/**
 * Get information about a media asset
 * @param {Object} asset - The media asset from MediaLibrary
 * @returns {Promise<Object>} - A promise that resolves to the asset info
 */
export const getAssetInfo = async (asset) => {
  try {
    // Get basic asset info
    const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
    if (!assetInfo) {
      console.warn(`No asset info found for ${asset.filename}`);
      return null;
    }

    // Initialize metadata
    const metadata = {
      title: assetInfo.title || asset.filename,
      artist: assetInfo.artist || 'Unknown Artist',
      album: assetInfo.album || 'Unknown Album',
      year: assetInfo.year || '',
      genre: assetInfo.genre || '',
      duration: assetInfo.duration || 0,
      artwork: null,
    };

    const cachedArtwork = await getCachedArtwork(asset.uri);
    if (cachedArtwork) {
      metadata.artwork = cachedArtwork;
      return { ...assetInfo, ...metadata };
    }

    // If no cached artwork, try to extract it from the asset
    try {
      const artwork = await getAlbumArtwork(asset.uri);
      if (artwork) {
        metadata.artwork = artwork;
      }
    } catch (error) {
      console.warn(`Error extracting artwork for ${asset.filename}:`, error);
    }

    // If we still don't have metadata, try to extract it from the audio file
    if (!metadata.artist || metadata.artist === 'Unknown Artist') {
      try {
        const audioMetadata = await getAudioMetadata(asset.uri);
        if (audioMetadata) {
          metadata.title = audioMetadata.title || metadata.title;
          metadata.artist = audioMetadata.artist || metadata.artist;
          metadata.album = audioMetadata.album || metadata.album;
          metadata.year = audioMetadata.year || metadata.year;
          metadata.genre = audioMetadata.genre || metadata.genre;
          metadata.duration = audioMetadata.duration || metadata.duration;
          metadata.artwork = audioMetadata.artwork || metadata.artwork;
        }
      } catch (error) {
        console.warn(`Error extracting metadata for ${asset.filename}:`, error);
      }
    }

    // If we still don't have artist/title, try to parse from filename
    if (!metadata.artist || metadata.artist === 'Unknown Artist') {
      const parsed = parseMetadata(asset.filename);
      if (parsed.artist) {
        metadata.artist = parsed.artist;
      }
      if (parsed.title) {
        metadata.title = parsed.title;
      }
    }

    return { ...assetInfo, ...metadata };
  } catch (error) {
    console.error(`Error getting asset info for ${asset.filename}:`, error);
    return null;
  }
};

/**
 * Refresh artwork for a specific asset
 * @param {Object} asset - The media asset from MediaLibrary
 * @returns {Promise<string|null>} - A promise that resolves to the new artwork data URL or null
 */
export const refreshArtworkForAsset = async (asset) => {
  if (!asset || !asset.uri) {
    console.warn('Cannot refresh artwork: Invalid asset or missing URI');
    return null;
  }

  try {
    console.log(`Refreshing artwork for ${asset.filename}`);

    // Try to extract artwork from the asset
    const artwork = await getAlbumArtwork(asset.uri);
    if (artwork) {
      // Cache the new artwork
      await cacheArtwork(asset.uri, artwork);
      return artwork;
    }

    console.warn(`No artwork found for ${asset.filename}`);
    return null;
  } catch (error) {
    console.error(`Error refreshing artwork for ${asset.filename}:`, error);
    return null;
  }
};

/**
 * Clean up expired cache entries
 * @param {number} maxAge - Maximum age of cache in milliseconds
 * @returns {Promise<number>} - A promise that resolves to the number of files deleted
 */
export const cleanupExpiredCache = async (maxAge = 30 * 24 * 60 * 60 * 1000) => {
  try {
    if (!db) {
      await initDatabase();
    }

    // Get all cache files
    const cacheFiles = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of cacheFiles) {
      try {
        const filePath = CACHE_DIR + file;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (!fileInfo.exists) {
          continue;
        }

        // Read the cache file to check its timestamp
        const cacheContent = await FileSystem.readAsStringAsync(filePath);
        const cacheData = JSON.parse(cacheContent);

        // Check if cache is expired
        if (cacheData.timestamp && (now - cacheData.timestamp) > maxAge) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          deletedCount++;
        }
      } catch (fileError) {
        console.warn(`Failed to process cache file ${file}:`, fileError);
        // Continue with other files even if one fails
      }
    }

    console.log(`Cleaned up ${deletedCount} expired cache entries`);
    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
    return 0;
  }
};

/**
 * List all cached artwork files with details
 * @returns {Promise<Array<{key: string, uri: string, timestamp: number, size: number}>>} - A promise that resolves to an array of cache file details
 */
export const listCachedFiles = async () => {
  try {
    if (!db) {
      await initDatabase();
    }
    const cacheFiles = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const fileDetails = [];

    for (const file of cacheFiles) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const filePath = CACHE_DIR + file;
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
        if (!fileInfo.exists) {
          continue;
        }

        const cacheContent = await FileSystem.readAsStringAsync(filePath);
        const data = JSON.parse(cacheContent);

        fileDetails.push({
          key: file.replace('.json', ''),
          uri: data.uri || 'Unknown URI',
          timestamp: data.timestamp || 0,
          size: fileInfo.size || 0,
        });
      } catch (fileError) {
        console.warn(`Failed to process cache file ${file} for listing:`, fileError);
      }
    }

    // Sort by timestamp, newest first
    fileDetails.sort((a, b) => b.timestamp - a.timestamp);

    return fileDetails;
  } catch (error) {
    console.error('Error listing cached files:', error);
    return [];
  }
};

// Initialize database when module is imported
initDatabase().catch(console.error);

// Initialize cache directory when module is imported
ensureCacheDir().catch(console.error);
