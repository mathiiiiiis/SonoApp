import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Dimensions,
  FlatList,
  Modal,
  Image,
  ProgressBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AudioContext } from '../context/AudioContext';
import EqualizerControls from '../components/player/EqualizerControls';
import * as FileSystem from 'expo-file-system';
import { getArtworkCacheSize, clearArtworkCache, listCachedFiles } from '../utils/cacheManager';
import Slider from '@react-native-community/slider';
import { useAudio } from '../context/AudioContext';


const { width, height } = Dimensions.get('window');

// Memoized component for rendering a single cache file item
const CacheFileListItem = memo(({ item, onPress, formatBytes, formatTimestamp }) => {
  return (
    <TouchableOpacity onPress={() => onPress(item)} style={styles.cacheFileItemTouchable}>
      <View style={styles.cacheFileItem}>
        <Text style={styles.cacheFileUri} numberOfLines={1} ellipsizeMode="middle">
          URI: {item.uri}
        </Text>
        <Text style={styles.cacheFileInfo}>
          Size: {formatBytes(item.size)} | Cached: {formatTimestamp(item.timestamp)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// Empty list component for FlatList
const EmptyListComponent = () => <Text style={styles.emptyListText}>No cached files found.</Text>;

const SettingsScreen = ({ navigation }) => {
  const {
    isOfflineMode,
    offlineTracks,
    offlinePlaylists,
    isDownloading,
    downloadProgress,
    toggleOfflineMode,
    // eslint-disable-next-line no-unused-vars
    saveTrackOffline,
    // eslint-disable-next-line no-unused-vars
    savePlaylistOffline,
    // eslint-disable-next-line no-unused-vars
    removeOfflineTrack,
    // eslint-disable-next-line no-unused-vars
    removeOfflinePlaylist,
    clearOfflineStorage,
    getOfflineStorageUsage,
  } = useAudio();

  const [offlineStorageUsage, setOfflineStorageUsage] = useState(0);
  const insets = useSafeAreaInsets();
  const audioContext = useContext(AudioContext);

  // Local state
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [cacheInfo, setCacheInfo] = useState({ size: 0, count: 0 });
  const [cachedFiles, setCachedFiles] = useState([]);
  const [showCachedFilesModal, setShowCachedFilesModal] = useState(false);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Set default values in case context is not loaded yet
  const defaultValues = {
    crossfadeDuration: 0,
    gaplessPlayback: false,
    normalization: false,
    monoAudio: false,
    streamCellular: true,
    audioQuality: 'high',
    downloadQuality: 'high',
  };

  // Quality options
  const qualityOptions = [
    { value: 'low', label: 'Low (96 kbps)' },
    { value: 'medium', label: 'Medium (160 kbps)' },
    { value: 'high', label: 'High (320 kbps)' },
    { value: 'lossless', label: 'Lossless (FLAC)' },
  ];

  // Log the context value on render for debugging
  useEffect(() => {
    console.log('AudioContext value in SettingsScreen:', audioContext);
  }, [audioContext]);

  // Get cache information
  const getCacheInfo = async () => {
    setIsLoadingCache(true);
    try {
      const size = await getArtworkCacheSize();
      const files = await listCachedFiles();
      setCacheInfo({ size, count: files.length });
      setCachedFiles(files);
    } catch (error) {
      console.error('Error getting cache info:', error);
      setCacheInfo({ size: 0, count: 0 });
      setCachedFiles([]);
    } finally {
      setIsLoadingCache(false);
    }
  };

  useEffect(() => {
    getCacheInfo();
  }, []);

  const formatBytes = (bytes) => {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) {
      return 'N/A';
    }
    return new Date(timestamp).toLocaleString();
  };

  const handleClearCache = async () => {
    try {
      await clearArtworkCache();
      await getCacheInfo();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  // Safe getters for context values
  const getValue = (key) => {
    return audioContext?.[key] !== undefined ? audioContext[key] : defaultValues[key];
  };

  // Safe method callers
  const callMethod = async (method, ...args) => {
    if (audioContext && typeof audioContext[method] === 'function') {
      try {
        await audioContext[method](...args);
      } catch (error) {
        console.error(`Error calling ${method}:`, error);
      }
    } else {
      console.warn(`Method ${method} not available in AudioContext`);
    }
  };

  // Function to retrieve artwork data from cache file
  const getArtworkDataFromCache = async (cacheFileKey) => {
    const cachePath = FileSystem.cacheDirectory + 'artwork/' + cacheFileKey + '.json';
    try {
      const fileInfo = await FileSystem.getInfoAsync(cachePath);
      if (!fileInfo.exists) {
        return null;
      }

      const cacheContent = await FileSystem.readAsStringAsync(cachePath);
      const cacheData = JSON.parse(cacheContent);
      return cacheData.artwork; // Return the base64 data URL
    } catch (error) {
      console.error(`Error reading cache file ${cacheFileKey}:`, error);
      return null;
    }
  };

  // Memoize handleViewImage using useCallback
  const handleViewImage = useCallback(async (item) => {
    const artworkData = await getArtworkDataFromCache(item.key);
    if (artworkData) {
      setSelectedImageUri(artworkData);
      setShowCachedFilesModal(false); // Close file list modal
      setShowImageModal(true); // Open image modal
    } else {
      // eslint-disable-next-line no-alert
      alert('Could not load artwork data.');
    }
  }, []); // Dependencies: Add any state/props used inside if needed, but seems self-contained now

  // Updated handler for slider
  const handleCrossfadeChange = useCallback((value) => {
    if (audioContext && typeof audioContext.setCrossfadeDuration === 'function') {
      audioContext.setCrossfadeDuration(value);
    } else {
      console.warn('setCrossfadeDuration function not available on context when slider changed.');
      // Optionally, provide feedback to the user or retry?
    }
  }, [audioContext]); // Depend on audioContext

  // Load offline storage usage
  useEffect(() => {
    const loadStorageUsage = async () => {
      const usage = await getOfflineStorageUsage();
      setOfflineStorageUsage(usage);
    };
    loadStorageUsage();
  }, [offlineTracks, offlinePlaylists, getOfflineStorageUsage]);

  // Format storage size
  const formatStorageSize = (bytes) => {
    if (bytes === 0) {return '0 B';}
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const renderOfflineSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Offline Mode</Text>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Offline Mode</Text>
          <Text style={styles.settingDescription}>
            Only play downloaded tracks when offline
          </Text>
        </View>
        <Switch
          value={isOfflineMode}
          onValueChange={toggleOfflineMode}
          trackColor={{ false: '#767577', true: '#FF4893' }}
          thumbColor={isOfflineMode ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.storageInfo}>
        <Text style={styles.storageTitle}>Storage Usage</Text>
        <Text style={styles.storageSize}>
          {formatStorageSize(offlineStorageUsage)}
        </Text>
        <Text style={styles.storageDetails}>
          {offlineTracks.length} tracks • {offlinePlaylists.length} playlists
        </Text>
      </View>

      {isDownloading && (
        <View style={styles.downloadProgress}>
          <Text style={styles.downloadText}>Downloading...</Text>
          <ProgressBar
            progress={downloadProgress / 100}
            color="#FF4893"
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>{Math.round(downloadProgress)}%</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.clearButton}
        onPress={async () => {
          const success = await clearOfflineStorage();
          if (success) {
            setOfflineStorageUsage(0);
          }
        }}
      >
        <Text style={styles.clearButtonText}>Clear Offline Storage</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#373737', '#121212']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Try to go back, but if that fails, navigate to the main screen
              try {
                navigation.goBack();
              } catch (err) {
                navigation.navigate('Main');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderOfflineSection()}
        {/* Playback Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>

          <View style={styles.settingItemSlider}>
            <Text style={styles.settingLabel}>Crossfade Duration</Text>
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10} // e.g., 0-10 seconds
                step={1} // Whole seconds
                value={getValue('crossfadeDuration')}
                onSlidingComplete={handleCrossfadeChange}
                minimumTrackTintColor="#FF4893"
                maximumTrackTintColor="#555"
                thumbTintColor="#FF4893"
              />
              <Text style={styles.sliderValueText}>{getValue('crossfadeDuration')}s</Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Gapless Playback</Text>
            <Switch
              value={getValue('gaplessPlayback')}
              onValueChange={() => callMethod('toggleGaplessPlayback')}
              trackColor={{ false: '#767577', true: '#FF4893' }}
              thumbColor={getValue('gaplessPlayback') ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Volume Normalization</Text>
            <Switch
              value={getValue('normalization')}
              onValueChange={() => callMethod('toggleNormalization')}
              trackColor={{ false: '#767577', true: '#FF4893' }}
              thumbColor={getValue('normalization') ? '#fff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowEqualizer(!showEqualizer)}
          >
            <Text style={styles.settingLabel}>Equalizer</Text>
            <Ionicons
              name={showEqualizer ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          {showEqualizer && (
            audioContext ? <EqualizerControls /> : <Text style={styles.errorText}>Audio Context not available for Equalizer</Text>
          )}
        </View>

        {/* Audio Quality Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audio Quality</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Volume Normalization</Text>
            <Switch
              value={getValue('normalization')}
              onValueChange={() => callMethod('toggleNormalization')}
              trackColor={{ false: '#767577', true: '#FF4893' }}
              thumbColor={getValue('normalization') ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.qualitySelector}>
            <Text style={styles.qualityLabel}>Streaming Quality</Text>
            <View style={styles.qualityOptions}>
              {qualityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.qualityOption,
                    getValue('audioQuality') === option.value && styles.qualityOptionSelected,
                  ]}
                  onPress={() => callMethod('setAudioQuality', option.value)}
                >
                  <Text style={[
                    styles.qualityOptionText,
                    getValue('audioQuality') === option.value && styles.qualityOptionTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.qualitySelector}>
            <Text style={styles.qualityLabel}>Download Quality</Text>
            <View style={styles.qualityOptions}>
              {qualityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.qualityOption,
                    getValue('downloadQuality') === option.value && styles.qualityOptionSelected,
                  ]}
                  onPress={() => callMethod('setDownloadQuality', option.value)}
                >
                  <Text style={[
                    styles.qualityOptionText,
                    getValue('downloadQuality') === option.value && styles.qualityOptionTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Stream on Cellular</Text>
            <Switch
              value={getValue('streamCellular')}
              onValueChange={() => callMethod('toggleStreamCellular')}
              trackColor={{ false: '#767577', true: '#FF4893' }}
              thumbColor={getValue('streamCellular') ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Accessibility Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Mono Audio</Text>
            <Switch
              value={getValue('monoAudio')}
              onValueChange={() => callMethod('toggleMonoAudio')}
              trackColor={{ false: '#767577', true: '#FF4893' }}
              thumbColor={getValue('monoAudio') ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Storage Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Artwork Cache Size</Text>
            <Text style={styles.settingValue}>
              {isLoadingCache ? 'Loading...' : `${formatBytes(cacheInfo?.size || 0)} (${cacheInfo?.count || 0} files)`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewCacheButton}
            onPress={() => setShowCachedFilesModal(true)}
            disabled={isLoadingCache || cacheInfo.count === 0}
          >
            <Text style={styles.viewCacheButtonText}>View Cached Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearCacheButton}
            onPress={handleClearCache}
            disabled={isLoadingCache}
          >
            <Text style={styles.clearCacheButtonText}>Clear Cache</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Cached Files List Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCachedFilesModal}
        onRequestClose={() => setShowCachedFilesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cached Artwork Files</Text>
            <FlatList
              data={cachedFiles}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <CacheFileListItem
                  item={item}
                  onPress={handleViewImage}
                  formatBytes={formatBytes}
                  formatTimestamp={formatTimestamp}
                />
              )}
              ListEmptyComponent={EmptyListComponent}
              style={styles.flatList}
              windowSize={10} // Optimization: Render items further outside the viewport
              initialNumToRender={15} // Optimization: Render more items initially
              maxToRenderPerBatch={10} // Optimization: Render more items per batch
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowCachedFilesModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showImageModal}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.closeImageButton}
            onPress={() => setShowImageModal(false)}
          >
            <Ionicons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedImageUri ? (
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.emptyListText}>No Image Selected</Text>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 30,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
  },
  settingValue: {
    color: '#FF4893',
    fontSize: 16,
  },
  qualitySelector: {
    marginBottom: 20,
  },
  qualityLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  qualityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualityOption: {
    backgroundColor: '#3e3e3e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  qualityOptionSelected: {
    backgroundColor: '#FF4893',
  },
  qualityOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  qualityOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  clearCacheButton: {
    backgroundColor: '#FF4893',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 16,
  },
  clearCacheButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewCacheButton: {
    backgroundColor: '#555',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 16,
  },
  viewCacheButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#282828',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  flatList: {
    width: '100%',
    marginBottom: 15,
  },
  cacheFileItemTouchable: {
    marginBottom: 10,
  },
  cacheFileItem: {
    backgroundColor: '#3e3e3e',
    padding: 10,
    borderRadius: 8,
    width: '100%',
  },
  cacheFileUri: {
    color: '#eee',
    fontSize: 12,
    marginBottom: 4,
  },
  cacheFileInfo: {
    color: '#bbb',
    fontSize: 11,
  },
  emptyListText: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
  },
  closeModalButton: {
    backgroundColor: '#FF4893',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  versionText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  imageModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)', // Darker background for image view
  },
  fullScreenImage: {
    width: width * 0.9, // 90% of screen width
    height: height * 0.8, // 80% of screen height
  },
  closeImageButton: {
    position: 'absolute',
    top: 50, // Adjust as needed, considering safe area
    right: 20,
    zIndex: 10,
  },
  settingItemSlider: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  slider: {
    flex: 1, // Take most of the space
    height: 40,
  },
  sliderValueText: {
    color: '#FF4893',
    fontSize: 16,
    minWidth: 40, // Ensure space for value like "10s"
    textAlign: 'right',
    marginLeft: 10,
  },
  errorText: {
    color: '#FF6B6B', // A reddish error color
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
    marginTop: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 5,
  },
  storageInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  storageTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  storageSize: {
    color: '#FF4893',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  storageDetails: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  downloadProgress: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  downloadText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  clearButton: {
    marginTop: 16,
    backgroundColor: 'rgba(255,72,147,0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FF4893',
    fontSize: 16,
    fontWeight: '600',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  settingDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
});

export default SettingsScreen;
