import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useAudio } from '../context/AudioContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PlaylistManagementScreen = ({ route, navigation }) => {
  const { playlistId } = route.params || {};
  const {
    getPlaylistById,
    createPlaylist,
    updatePlaylistDetails,
    deletePlaylist,
    clearPlaylist,
    duplicatePlaylist,
    getPlaylistStats,
  } = useAudio();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (playlistId) {
      const playlist = getPlaylistById(playlistId);
      if (playlist) {
        setName(playlist.name);
        setDescription(playlist.description || '');
        setIsPrivate(playlist.isPrivate || false);
        setStats(getPlaylistStats(playlistId));
      }
    }
  }, [playlistId, getPlaylistById, getPlaylistStats]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    setIsLoading(true);
    try {
      if (playlistId) {
        await updatePlaylistDetails(playlistId, { name, description, isPrivate });
      } else {
        await createPlaylist(name);
      }
      try {
        navigation.goBack();
      } catch (err) {
        navigation.navigate('Main');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Playlist',
      'Are you sure you want to delete this playlist? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePlaylist(playlistId);
            try {
              navigation.goBack();
            } catch (err) {
              navigation.navigate('Main');
            }
          },
        },
      ]
    );
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Playlist',
      'Are you sure you want to remove all tracks from this playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearPlaylist(playlistId);
            try {
              navigation.goBack();
            } catch (err) {
              navigation.navigate('Main');
            }
          },
        },
      ]
    );
  };

  const handleDuplicate = () => {
    const newPlaylistId = duplicatePlaylist(playlistId);
    if (newPlaylistId) {
      try {
        navigation.goBack();
      } catch (err) {
        navigation.navigate('Main');
      }
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#373737', '#121212']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              try {
                navigation.goBack();
              } catch (err) {
                navigation.navigate('Main');
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {playlistId ? 'Edit Playlist' : 'New Playlist'}
          </Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#1DB954" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter playlist name"
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter playlist description"
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.switchGroup}>
          <Text style={styles.label}>Private Playlist</Text>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: '#666', true: '#1DB954' }}
            thumbColor={isPrivate ? '#fff' : '#fff'}
          />
        </View>

        {stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Playlist Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.trackCount}</Text>
                <Text style={styles.statLabel}>Tracks</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.uniqueArtists}</Text>
                <Text style={styles.statLabel}>Artists</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.uniqueAlbums}</Text>
                <Text style={styles.statLabel}>Albums</Text>
              </View>
            </View>
          </View>
        )}

        {playlistId && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.duplicateButton]}
              onPress={handleDuplicate}
            >
              <Ionicons name="copy-outline" size={24} color="#1DB954" />
              <Text style={styles.actionButtonText}>Duplicate Playlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClear}
            >
              <Ionicons name="trash-outline" size={24} color="#FF4444" />
              <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                Clear Playlist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Ionicons name="alert-circle-outline" size={24} color="#FF4444" />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                Delete Playlist
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#282828',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsContainer: {
    backgroundColor: '#282828',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 16,
  },
  statValue: {
    color: '#1DB954',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#999',
    fontSize: 14,
  },
  actionsContainer: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#282828',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  duplicateButton: {
    borderColor: '#1DB954',
    borderWidth: 1,
  },
  clearButton: {
    borderColor: '#FF4444',
    borderWidth: 1,
  },
  clearButtonText: {
    color: '#FF4444',
  },
  deleteButton: {
    borderColor: '#FF4444',
    borderWidth: 1,
  },
  deleteButtonText: {
    color: '#FF4444',
  },
});

export default PlaylistManagementScreen;
