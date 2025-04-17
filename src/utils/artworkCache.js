import * as FileSystem from 'expo-file-system';
import { openDatabase } from 'expo-sqlite';

// Cache directory for artwork
const CACHE_DIR = FileSystem.cacheDirectory + 'artwork_cache/';
const DB_NAME = 'artwork_cache.db';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB max cache size
// eslint-disable-next-line no-unused-vars
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
    const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
    await FileSystem.deleteAsync(dbPath, { idempotent: true });

    // Reinitialize the database
    await initDatabase();
  } catch (error) {
    console.error('Error resetting database:', error);
  }
};

const getCachedArtwork = async (uri) => {
  try {
    if (!db) {
      await initDatabase();
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT artwork FROM artwork_cache WHERE uri = ?',
          [uri],
          (_, result) => {
            if (result.rows.length > 0) {
              resolve(result.rows.item(0).artwork);
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            console.error('Error getting cached artwork:', error);
            reject(error);
          }
        );
      });
    });
  } catch (error) {
    console.error('Error getting cached artwork:', error);
    return null;
  }
};

const cacheArtwork = async (uri, artwork) => {
  try {
    if (!db) {
      await initDatabase();
    }

    const timestamp = Date.now();
    const size = artwork.length;

    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT OR REPLACE INTO artwork_cache (uri, artwork, timestamp, size) VALUES (?, ?, ?, ?)',
          [uri, artwork, timestamp, size],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });

    // Clean up old entries if needed
    await cleanupCache();
  } catch (error) {
    console.error('Error caching artwork:', error);
  }
};

const cleanupCache = async () => {
  try {
    if (!db) {
      await initDatabase();
    }

    // Get total cache size
    const result = await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT SUM(size) as total_size FROM artwork_cache',
          [],
          (_, sizeResult) => resolve(sizeResult.rows.item(0).total_size || 0),
          (_, error) => reject(error)
        );
      });
    });

    // If cache is too large, remove oldest entries
    if (result > MAX_CACHE_SIZE) {
      await new Promise((resolve, reject) => {
        db.transaction(tx => {
          tx.executeSql(
            'DELETE FROM artwork_cache WHERE uri IN (SELECT uri FROM artwork_cache ORDER BY timestamp ASC LIMIT ?)',
            [Math.ceil((result - MAX_CACHE_SIZE) / 1024)], // Approximate number of entries to remove
            () => resolve(),
            (_, error) => reject(error)
          );
        });
      });
    }

    // Remove entries older than 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM artwork_cache WHERE timestamp < ?',
          [sevenDaysAgo],
          () => resolve(),
          (_, error) => reject(error)
        );
      });
    });
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
};

// Initialize database when module is imported
initDatabase().catch(console.error);

export {
  getCachedArtwork,
  cacheArtwork,
  cleanupCache,
  resetDatabase,
};
