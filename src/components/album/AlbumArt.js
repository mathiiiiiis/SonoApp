import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAlbumArtwork } from '../../utils/artworkHelper';
import { getCachedArtwork } from '../../utils/cacheManager';

// Global artwork cache to store loaded artwork
const globalArtworkCache = new Map();

const AlbumArt = ({ track, size = 200, style }) => {
  const [artwork, setArtwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [retryCount, setRetryCount] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const MAX_RETRIES = 1; // Reduced to 1 retry since we're using global cache
  // eslint-disable-next-line no-unused-vars
  const RETRY_DELAY = 500; // Reduced delay

  useEffect(() => {
    let isMounted = true;
    let retryTimeout;

    const loadArtwork = async () => {
      try {
        setLoading(true);
        setError(false);

        // First check if artwork is in global cache
        if (globalArtworkCache.has(track.uri)) {
          console.log(`Using cached artwork for: ${track.title}`);
          setArtwork(globalArtworkCache.get(track.uri));
          setLoading(false);
          return;
        }

        // Then check if artwork is in the track object
        if (track.artwork) {
          console.log(`Using track artwork for: ${track.title}`);
          globalArtworkCache.set(track.uri, track.artwork);
          setArtwork(track.artwork);
          setLoading(false);
          return;
        }

        // Then check if artwork is in the local cache
        const cachedArtwork = await getCachedArtwork(track.uri);
        if (cachedArtwork) {
          console.log(`Using local cache for: ${track.title}`);
          globalArtworkCache.set(track.uri, cachedArtwork);
          setArtwork(cachedArtwork);
          setLoading(false);
          return;
        }

        // If not found in any cache, extract from file
        console.log(`Extracting artwork for: ${track.title}`);
        const extractedArtwork = await getAlbumArtwork(track.uri);

        if (extractedArtwork) {
          console.log(`Successfully extracted artwork for: ${track.title}`);
          globalArtworkCache.set(track.uri, extractedArtwork);
          setArtwork(extractedArtwork);
        } else {
          console.log(`No artwork found for: ${track.title}`);
          setError(true);
        }
      } catch (err) {
        console.error(`Error loading artwork for ${track.title}:`, err);
        setError(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadArtwork();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [track.uri, track.title, track.artwork,retryCount]);

  if (loading) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <ActivityIndicator size="large" color="#FF4893" />
      </View>
    );
  }

  if (error || !artwork) {
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <LinearGradient
          colors={['#1E3264', '#764BA2']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: artwork }}
      style={[styles.artwork, { width: size, height: size }, style]}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  artwork: {
    borderRadius: 8,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});

export default AlbumArt;
