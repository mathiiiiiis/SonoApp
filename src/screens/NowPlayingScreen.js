import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  PanResponder,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Text,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useAudio } from '../context/AudioContext';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AlbumArt from '../components/album/AlbumArt';

const { width, height } = Dimensions.get('window');

const NowPlayingScreen = ({ navigation }) => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlayPause,
    handleNext,
    handlePrevious,
    playbackPosition,
    playbackDuration,
    seekTo,
    isShuffle,
    isRadioMode,
    toggleShuffle,
    toggleRadioMode,
    repeatMode,
    toggleRepeat,
    isTrackLiked,
    toggleLike,
    audioFiles,
    currentPlaylist,
    playTrack,
  } = useAudio();

  const insets = useSafeAreaInsets();
  const [sliderValue, setSliderValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Animation for appearing
  const slideAnim = useRef(new Animated.Value(height)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Additional animations
  const lyricsSlideAnim = useRef(new Animated.Value(height)).current;
  const albumFadeAnim = useRef(new Animated.Value(1)).current;
  const queueSlideAnim = useRef(new Animated.Value(height)).current;

  // Add new animated value for tab indicator
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Use currentPlaylist as the queue if available, otherwise fallback to audioFiles
  const queue = currentPlaylist && currentPlaylist.length > 0
    ? currentPlaylist
    : audioFiles.slice(0, 10);

  // Add function to animate tab changes
  const animateTabChange = useCallback((index) => {
    Animated.spring(tabIndicatorAnim, {
      toValue: index,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [tabIndicatorAnim]);

  // Add new state for double tap detection
  const [lastTapTime, setLastTapTime] = useState(0);

  // PanResponder for swipe-to-dismiss and horizontal gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Respond to both vertical and horizontal gestures
        return Math.abs(gestureState.dy) > 20 || Math.abs(gestureState.dx) > 20;
      },
      onPanResponderMove: (_, gestureState) => {
        // Determine if the gesture is primarily vertical or horizontal
        const isVerticalGesture = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

        if (isVerticalGesture) {
          // Vertical gesture - handle dismiss
          if (gestureState.dy > 0) {
            slideAnim.setValue(gestureState.dy);
            opacityAnim.setValue(1 - (gestureState.dy / (height / 2)));
            scaleAnim.setValue(1 - (gestureState.dy / height) * 0.2);
          }
        } else {
          // Horizontal gesture - handle track navigation
          // Don't animate the screen for horizontal gestures
          if (gestureState.dx > 50) {
            // Right swipe - next track
            handleNext();
          } else if (gestureState.dx < -50) {
            // Left swipe - previous track
            handlePrevious();
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Determine if the gesture is primarily vertical or horizontal
        const isVerticalGesture = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

        if (isVerticalGesture) {
          // Vertical gesture release
          if (gestureState.dy > 100) {
            closeModal();
          } else {
            Animated.parallel([
              Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
              }),
              Animated.spring(opacityAnim, {
                toValue: 1,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }
        // For horizontal gestures we dont need to do anything on release
        // as the track change is already handled in onPanResponderMove
      },
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Handle double tap for play/pause
        const now = Date.now();
        if (lastTapTime && (now - lastTapTime) < 300) {
          // Double tap detected
          togglePlayPause();
          setLastTapTime(0);
        } else {
          setLastTapTime(now);
        }
      },
    })
  ).current;

  // Update pan responders to handle vertical gestures
  const lyricsPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          lyricsSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          toggleLyricsView();
        } else {
          Animated.spring(lyricsSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const queuePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          queueSlideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          toggleQueueView();
        } else {
          Animated.spring(queueSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Start animation when screen mounts
  useEffect(() => {
    // Ensure dark mode
    navigation.setOptions({
      cardStyle: { backgroundColor: '#000' },
    });

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    animateTabChange(0);
  }, [navigation, slideAnim, opacityAnim, animateTabChange]);

  // Reset slider when track changes
  useEffect(() => {
    if (currentTrack?.id !== currentTrackId) {
      setSliderValue(0);
      setCurrentTrackId(currentTrack?.id);

      // Reset views if track changes
      if (showLyrics) {
        toggleLyricsView();
      }
      if (showQueue) {
        toggleQueueView();
      }
    }
  }, [currentTrack, currentTrackId, showLyrics, showQueue, toggleLyricsView, toggleQueueView]);

  // Update slider value only when not seeking and position changes
  useEffect(() => {
    if (!isSeeking && currentTrack && playbackPosition >= 0) {
      setSliderValue(playbackPosition);
    }
  }, [playbackPosition, playbackDuration, isSeeking, currentTrack]);

  const closeModal = () => {
    // Set background to black to prevent white flash
    navigation.setOptions({
      cardStyle: { backgroundColor: '#000' },
    });

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      try {
        navigation.goBack();
      } catch (err) {
        navigation.navigate('Main');
      }
    });
  };

  const handleSeek = (value) => {
    setIsSeeking(true);
    setSliderValue(value);
  };

  const handleSlidingComplete = async (value) => {
    setSliderValue(value);
    await seekTo(value);

    // Small delay to ensure seek is complete
    setTimeout(() => {
      setIsSeeking(false);
    }, 50);
  };

  const handleSlidingStart = () => {
    setIsSeeking(true);
  };

  const toggleLyricsView = useCallback(() => {
    if (showLyrics) {
      // Hide lyrics view
      Animated.parallel([
        Animated.timing(lyricsSlideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(albumFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Add tab indicator animation
        Animated.spring(tabIndicatorAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowLyrics(false);
      });
    } else {
      // Hide queue if it's showing
      if (showQueue) {
        toggleQueueView();
      }

      // Show lyrics view
      setShowLyrics(true);
      Animated.parallel([
        Animated.timing(lyricsSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(albumFadeAnim, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
        // Add tab indicator animation
        Animated.spring(tabIndicatorAnim, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showLyrics, showQueue, lyricsSlideAnim, albumFadeAnim, tabIndicatorAnim, toggleQueueView]);

  const toggleQueueView = useCallback(() => {
    if (showQueue) {
      // Hide queue view
      Animated.parallel([
        Animated.timing(queueSlideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        // Add tab indicator animation
        Animated.spring(tabIndicatorAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowQueue(false);
      });
    } else {
      // Hide lyrics if it's showing
      if (showLyrics) {
        toggleLyricsView();
      }

      // Show queue view
      setShowQueue(true);
      Animated.timing(queueSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showQueue, showLyrics, queueSlideAnim, tabIndicatorAnim, toggleLyricsView]);

  const handleTabPress = (index) => {
    animateTabChange(index);
    if (index === 0) {
      if (showLyrics) {
        toggleLyricsView();
      }
      if (showQueue) {
        toggleQueueView();
      }
    } else if (index === 1) {
      if (!showLyrics) {
        toggleLyricsView();
      }
      else if (showQueue) {
        toggleQueueView();
        toggleLyricsView();
      }
    } else if (index === 2) {
      if (!showQueue) {
        toggleQueueView();
      }
      else if (showLyrics) {
        toggleLyricsView();
        toggleQueueView();
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayFromQueue = (track, index) => {
    if (playTrack) {
      // Play the selected track from the queue
      playTrack(track, queue, index);

      // Hide the queue view after selecting a track
      if (showQueue) {
        toggleQueueView();
      }
    }
  };

  const renderQueueItem = ({ item, index }) => {
    const isCurrentTrack = currentTrack && currentTrack.id === item.id;

    // Handle artwork for queue items
    let artworkSource = null;
    if (item.artwork) {
      if (typeof item.artwork === 'string') {
        artworkSource = { uri: item.artwork };
      } else if (item.artwork.uri) {
        artworkSource = { uri: item.artwork.uri };
      } else {
        artworkSource = item.artwork;
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.queueItem,
          isCurrentTrack && styles.currentQueueItem,
        ]}
        onPress={() => handlePlayFromQueue(item, index)}
      >
        <View style={styles.queueItemContent}>
          {artworkSource ? (
            <Image source={artworkSource} style={styles.queueItemArtwork} />
          ) : (
            <View style={[styles.queueItemArtwork, styles.placeholderArtwork]}>
              <Ionicons name="musical-note" size={20} color="#aaa" />
            </View>
          )}
          <View style={styles.queueItemInfo}>
            <Text style={[styles.queueItemTitle, isCurrentTrack && styles.currentQueueItemText]}>
              {item.title}
            </Text>
            <Text style={[styles.queueItemArtist, isCurrentTrack && styles.currentQueueItemText]}>
              {item.artist}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.queueItemButton}
          onPress={() => toggleLike(item.id)}
        >
          <Ionicons
            name={isTrackLiked(item.id) ? 'heart' : 'heart-outline'}
            size={20}
            color={isTrackLiked(item.id) ? '#FF4893' : '#aaa'}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (!currentTrack) {
    return null;
  }

  const liked = isTrackLiked(currentTrack.id);

  // Calculate progress directly as per user snippet
  const progress = playbackDuration ? (playbackPosition / playbackDuration) * 100 : 0;

  const indicatorTranslate = tabIndicatorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 80, 160], // Adjust these values based on your tab widths
  });

  const lyricsGradient = ['rgba(25, 0, 100, 0.95)', 'rgba(0, 0, 0, 0.98)'];
  const queueGradient = ['rgba(100, 0, 50, 0.95)', 'rgba(0, 0, 0, 0.98)'];

  return (
    <Animated.View
      style={[
        styles.container,
        // eslint-disable-next-line react-native/no-inline-styles
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          opacity: opacityAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <StatusBar style="light" />

      {/* Background blurred artwork */}
      <View style={styles.backgroundContainer}>
        {currentTrack.artwork ? (
          <>
            <Image
              source={
                typeof currentTrack.artwork === 'string'
                  ? { uri: currentTrack.artwork }
                  : currentTrack.artwork && currentTrack.artwork.uri
                    ? { uri: currentTrack.artwork.uri }
                    : currentTrack.artwork
              }
              style={styles.backgroundImage}
              blurRadius={25}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </>
        ) : (
          <LinearGradient
            colors={['#444', '#111']}
            style={styles.backgroundGradient}
          />
        )}
      </View>

      {/* Swipe indicator at the top */}
      <View style={styles.swipeIndicatorContainer}>
        <View style={styles.swipeIndicator} />
      </View>

      {/* Header with down arrow and options */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={closeModal}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTabs}>
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                transform: [{ translateX: indicatorTranslate }],
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.headerTab]}
            onPress={() => handleTabPress(0)}
          >
            <Text style={[styles.headerTabText, !showLyrics && !showQueue && styles.activeTabText]}>
              Player
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerTab]}
            onPress={() => handleTabPress(1)}
          >
            <Text style={[styles.headerTabText, showLyrics && styles.activeTabText]}>
              Lyrics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerTab]}
            onPress={() => handleTabPress(2)}
          >
            <Text style={[styles.headerTabText, showQueue && styles.activeTabText]}>
              Queue
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <Feather name="more-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Album art */}
      <Animated.View style={[styles.albumContainer, { opacity: albumFadeAnim }]}>
        <Animated.View
          style={[
            styles.albumWrapper,
            {
              transform: [
                {
                  rotate: isPlaying ? '0deg' : '0deg',
                  // TODO or not: add spinning animation
                },
              ],
            },
          ]}
        >
          <AlbumArt track={currentTrack} size={width - 100} textSize={80} />
        </Animated.View>

        {/* Loading indicator overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF4893" />
          </View>
        )}
      </Animated.View>

      {/* Lyrics view (animate in/out) */}
      {showLyrics && (
        <Animated.View
          style={[
            styles.lyricsContainer,
            {
              transform: [{ translateY: lyricsSlideAnim }],
            },
          ]}
          {...lyricsPanResponder.panHandlers}
        >
          <LinearGradient colors={lyricsGradient} style={StyleSheet.absoluteFill} />
          <BlurView intensity={20} tint="dark" style={styles.lyricsBlur}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Lyrics</Text>
              <TouchableOpacity style={styles.closeButton} onPress={toggleLyricsView}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.lyricsScrollView}
              contentContainerStyle={styles.lyricsContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Mock lyrics for demo - in a real app, you would fetch these from a service */}
            </ScrollView>
          </BlurView>
        </Animated.View>
      )}

      {/* Queue view (animate in/out) */}
      {showQueue && (
        <Animated.View
          style={[
            styles.queueContainer,
            {
              transform: [{ translateY: queueSlideAnim }],
            },
          ]}
          {...queuePanResponder.panHandlers}
        >
          <LinearGradient colors={queueGradient} style={StyleSheet.absoluteFill} />
          <BlurView intensity={20} tint="dark" style={styles.queueBlur}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>Up Next</Text>
              <TouchableOpacity style={styles.closeButton} onPress={toggleQueueView}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={queue}
              renderItem={renderQueueItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.queueList}
              showsVerticalScrollIndicator={false}
            />
          </BlurView>
        </Animated.View>
      )}

      {/* Track info */}
      <View style={styles.trackInfoContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.trackTitle} numberOfLines={2}>{currentTrack.title}</Text>
          <TouchableOpacity
            onPress={() => toggleLike(currentTrack.id)}
            style={styles.likeButton}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? '#FF4893' : '#fff'}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.trackArtist} numberOfLines={1}>{currentTrack.artist}</Text>
        {currentTrack.album && (
          <Text style={styles.trackAlbum} numberOfLines={1}>{currentTrack.album}</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBackground} />
          <View
            style={[styles.progressFill, { width: `${progress}%` }]}
          />
          <Slider
            style={styles.progressBar}
            minimumValue={0}
            maximumValue={playbackDuration > 0 ? playbackDuration : 1}
            value={sliderValue}
            minimumTrackTintColor="transparent"
            maximumTrackTintColor="transparent"
            thumbTintColor="transparent"
            onValueChange={handleSeek}
            onSlidingStart={handleSlidingStart}
            onSlidingComplete={handleSlidingComplete}
            thumbStyle={styles.sliderThumb}
          />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(playbackDuration)}</Text>
        </View>
      </View>

      {/* Playback controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={toggleShuffle} style={styles.secondaryButton}>
          <Ionicons
            name="shuffle"
            size={24}
            color={isShuffle ? '#FF4893' : 'rgba(255,255,255,0.7)'}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
          <Ionicons name="play-skip-back-sharp" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#111" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={36}
              color="#111"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
          <Ionicons name="play-skip-forward-sharp" size={32} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleRepeat} style={styles.secondaryButton}>
          {repeatMode === 2 ? (
            <MaterialCommunityIcons
              name="repeat-once"
              size={24}
              color={repeatMode > 0 ? '#FF4893' : 'rgba(255,255,255,0.7)'}
            />
          ) : (
            <Ionicons
              name="repeat"
              size={24}
              color={repeatMode > 0 ? '#FF4893' : 'rgba(255,255,255,0.7)'}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom action buttons */}
      <View style={styles.actionButtonContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={toggleLyricsView}
        >
          <Ionicons name="text" size={22} color="#fff" />
          <Text style={styles.actionButtonText}>Lyrics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={toggleQueueView}
        >
          <MaterialCommunityIcons name="playlist-music" size={22} color="#fff" />
          <Text style={styles.actionButtonText}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={toggleRadioMode}
        >
          <Ionicons
            name="radio"
            size={22}
            color={isRadioMode ? '#FF4893' : '#fff'}
          />
          <Text style={[
            styles.actionButtonText,
            // eslint-disable-next-line react-native/no-inline-styles
            isRadioMode && { color: '#FF4893' },
          ]}>Radio</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Solid black background to prevent white flash
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
    opacity: 0.8,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  swipeIndicatorContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 10,
  },
  swipeIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 4,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabIndicator: {
    position: 'absolute',
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    left: 4,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  albumContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    height: width - 80,
  },
  albumWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    borderRadius: 32, // Changed from (width - 100) / 2 to a fixed value
    overflow: 'hidden',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 32, // Match the albumWrapper borderRadius
  },
  lyricsContainer: {
    position: 'absolute',
    top: width - 10,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    zIndex: 5,
  },
  lyricsBlur: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  lyricsScrollView: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  lyricsContent: {
    paddingBottom: 200, // Extra space at bottom for scrolling
  },
  lyricText: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '500',
    lineHeight: 28,
  },
  queueContainer: {
    position: 'absolute',
    top: width - 10,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    zIndex: 5,
  },
  queueBlur: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  queueHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  queueTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  queueList: {
    paddingBottom: 200, // Extra space for scrolling past controls
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  currentQueueItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  queueItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueItemArtwork: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  placeholderArtwork: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  queueItemArtist: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  currentQueueItemText: {
    color: '#fff',
  },
  queueItemButton: {
    padding: 8,
  },
  trackInfoContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  likeButton: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    marginBottom: 4,
  },
  trackAlbum: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressBarContainer: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF4893',
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 3,
    zIndex: 1,
  },
  progressBar: {
    position: 'absolute',
    width: '100%',
    height: 30,
    top: -12,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  sliderThumb: {
    width: 12,
    height: 12,
    backgroundColor: 'transparent',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 36,
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NowPlayingScreen;
