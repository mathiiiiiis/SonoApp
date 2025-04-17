import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { StatusBar, View, Text, StyleSheet, Platform, Image, Animated, Easing } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
// eslint-disable-next-line no-unused-vars
import { getSongsAsync, requestPermissionsAsync } from './src/utils/mediaLibrary';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SQLite from 'expo-sqlite';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import PlaylistDetailsScreen from './src/screens/PlaylistDetailsScreen';
// eslint-disable-next-line no-unused-vars
import SettingsScreen from './src/screens/SettingsScreen';
import ArtistScreen from './src/screens/ArtistScreen';

// Import components
import MiniPlayer from './src/components/player/MiniPlayer';

// Import context provider
import { AudioProvider, useAudio } from './src/context/AudioContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Initialize SQLite database
// eslint-disable-next-line no-unused-vars
const db = SQLite.openDatabase('main.db');

// eslint-disable-next-line no-unused-vars
const generateColorFromString = (str) => {
  if (!str || typeof str !== 'string') {
    return '#FF4893';
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // eslint-disable-next-line no-bitwise
  let r = (hash & 0xFF) % 150 + 80;
  // eslint-disable-next-line no-bitwise
  let g = ((hash >> 8) & 0xFF) % 150 + 80;
  // eslint-disable-next-line no-bitwise
  let b = ((hash >> 16) & 0xFF) % 150 + 80;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Helper function to parse track info from filename
// eslint-disable-next-line no-unused-vars
const parseTrackInfo = (filename) => {
  if (!filename) {
    return { title: 'Unknown Title', artist: 'Unknown Artist' };
  }

  // Remove file extension
  let title = filename.replace(/\.[^/.]+$/, '');
  // Replace underscores with spaces
  title = title.replace(/_/g, ' ');
  // Remove leading numbers and delimiters often found in track listings
  title = title.replace(/^(\d+[\s.\-_]+)/, '');

  let artist = 'Unknown Artist';

  // Try to extract artist and title if filename follows common patterns
  // Pattern: "Artist - Title" or "Artist_-_Title"
  const artistTitleMatch = title.match(/^(.*?)[\s_]*-[\s_]*(.*?)$/);
  if (artistTitleMatch && artistTitleMatch.length === 3) {
    artist = artistTitleMatch[1].trim();
    title = artistTitleMatch[2].trim();
  }

  return { title, artist };
};

// eslint-disable-next-line no-unused-vars
const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#121212',
    primary: '#FF4893',
    card: '#121212',
    text: '#FFFFFF',
    border: 'transparent',
    notification: '#FF4893',
  },
};

const TabNavigator = () => (
  <Tab.Navigator screenOptions={{
    tabBarStyle: {
      backgroundColor: '#121212',
      borderTopWidth: 0,
      elevation: 8,
      height: 60,
      paddingBottom: 8,
      paddingTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    tabBarActiveTintColor: '#FF4893',
    tabBarInactiveTintColor: '#999',
    headerShown: false,
    tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
  }}>
    {/* eslint-disable-next-line react/no-unstable-nested-components */}
    <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color, size }) => (<Ionicons name="home" color={color} size={size} />) }} />
    {/* eslint-disable-next-line react/no-unstable-nested-components */}
    <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarIcon: ({ color, size }) => (<Ionicons name="search" color={color} size={size} />) }} />
    {/* eslint-disable-next-line react/no-unstable-nested-components */}
    <Tab.Screen name="Library" component={LibraryScreen} options={{ tabBarIcon: ({ color, size }) => (<Ionicons name="library" color={color} size={size} />) }} />
  </Tab.Navigator>
);

// eslint-disable-next-line no-unused-vars
const MainScreen = ({ navigation }) => {
  const { currentTrack } = useAudio();
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <TabNavigator />
      {currentTrack && <View style={styles.miniPlayerContainer}><MiniPlayer onPress={() => navigation.navigate('Now Playing')} /></View>}
    </View>
  );
};

const LoadingScreen = () => {
  const [progress] = useState(new Animated.Value(0));
  const progressValue = useRef(0);

  useEffect(() => {
    // Animate the progress from 0 to 1 over time
    Animated.timing(progress, {
      toValue: 1,
      duration: 3000, // Adjust the duration as needed
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Track the progress value
    const listener = progress.addListener(({ value }) => {
      progressValue.current = value;
    });

    return () => {
      progress.removeListener(listener);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Interpolate the progress value to create the border width animation
  const borderWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 4], // Max border width
  });

  return (
    <View style={styles.loadingContainer}>
      <Animated.View
        style={[
          styles.iconBorder,
          // eslint-disable-next-line react-native/no-inline-styles
          {
            borderWidth: borderWidth,
            borderColor: '#FF4893',
          },
        ]}
      >
        <Image
          source={require('./src/assets/splash-icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Request media library permissions
        const { status } = await requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Media library permission not granted');
          setIsLoading(false);
          return;
        }

        // Initialize audio session
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing app:', err);
        setError('Failed to initialize app');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Image
          source={require('./src/assets/splash-icon.png')}
          style={styles.splashIcon}
          resizeMode="contain"
        />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AudioProvider>
          <NavigationContainer theme={DefaultTheme}>
            <StatusBar barStyle="light-content" />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
              }}
            >
              <Stack.Screen name="MainTabs" component={TabNavigator} />
              <Stack.Screen name="NowPlaying" component={NowPlayingScreen} />
              <Stack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
              <Stack.Screen name="Artist" component={ArtistScreen} />
            </Stack.Navigator>
            <MiniPlayer />
          </NavigationContainer>
        </AudioProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 24,
  },
  iconBorder: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
  },
  splashIcon: {
    width: 120,
    height: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 24,
  },
  errorText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 58,
  },
});
