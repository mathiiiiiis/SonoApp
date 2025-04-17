import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { base64Encode } from './encodingHelper';
import { getAlbumArtwork } from './artworkHelper';
import { getCachedArtwork, cacheArtwork, cleanupCache, resetDatabase } from './artworkCache';

// Cache directory for artwork
const CACHE_DIR = FileSystem.cacheDirectory + 'artwork_cache/';

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
export const getCachedArtworkFromFile = async (uri) => {
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
export const cacheArtworkToFile = async (uri, artwork) => {
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
 * @returns {Promise<number>} - A promise that resolves to the size of the cache in bytes
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
        const filePath = CACHE_DIR + file;
        const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
        if (fileInfo.exists) {
          totalSize += fileInfo.size;
        }
      } catch (error) {
        console.warn(`Error getting size for cache file ${file}:`, error);
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
};

/**
 * Get information about an asset
 * @param {Object} asset - The asset to get information about
 * @returns {Promise<Object|null>} - A promise that resolves to the asset info or null
 */
export const getAssetInfo = async (asset) => {
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

/**
 * Refresh artwork for an asset
 * @param {Object} asset - The asset to refresh artwork for
 * @returns {Promise<string|null>} - A promise that resolves to the new artwork URI or null
 */
export const refreshArtworkForAsset = async (asset) => {
  try {
    // Try to get artwork from the asset info
    const assetInfo = await getAssetInfo(asset);
    if (assetInfo && assetInfo.albumId) {
      const album = await MediaLibrary.getAlbumAsync(assetInfo.albumId);
      if (album && album.coverImage) {
        return album.coverImage;
      }
    }

    // If no artwork found, try to extract it from the audio file
    return await getAlbumArtwork(asset.uri);
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
    await ensureCacheDir();

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
 * List all cached files
 * @returns {Promise<Array>} - A promise that resolves to an array of cached file info
 */
export const listCachedFiles = async () => {
  try {
    await ensureCacheDir();

    // Get all cache files
    const cacheFiles = await FileSystem.readDirectoryAsync(CACHE_DIR);
    const fileInfos = [];

    for (const file of cacheFiles) {
      try {
        const filePath = CACHE_DIR + file;
        const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          const data = JSON.parse(content);
          fileInfos.push({
            path: filePath,
            size: fileInfo.size,
            timestamp: data.timestamp || 0,
            uri: data.uri,
          });
        }
      } catch (error) {
        console.warn(`Error processing cache file ${file}:`, error);
      }
    }

    return fileInfos;
  } catch (error) {
    console.error('Error listing cached files:', error);
    return [];
  }
};

// Initialize cache directory when module is imported
ensureCacheDir().catch(console.error);

// Re-export artwork cache functions
export {
  getCachedArtwork,
  cacheArtwork,
  cleanupCache,
  resetDatabase,
};
