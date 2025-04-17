import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const DefaultAlbumArt = ({ size = 120, title = 'Album', style = {} }) => {
  // Get the first letter of the title for the placeholder
  const letter = title ? title.charAt(0).toUpperCase() : 'M';

  // Calculate text size based on container size
  const textSize = Math.floor(size * 0.4);

  // Generate a consistent color based on the title
  const getColorFromString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash * 32) - hash);
    }

    // Convert to hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = Math.floor((hash / Math.pow(256, i)) % 256);
      color += ('00' + value.toString(16)).substring(-2);
    }

    return color;
  };

  // Get gradient colors based on the title
  const getGradientColors = () => {
    const baseColor = getColorFromString(title);

    // Convert hex to RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    // Create darker and lighter variants
    const darker = `rgb(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 50)})`;
    const lighter = `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)})`;

    return [darker, baseColor, lighter];
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <LinearGradient
        colors={getGradientColors()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="musical-notes" size={size * 0.4} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={[styles.letter, { fontSize: textSize }]}>{letter}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'absolute',
    opacity: 0.3,
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default DefaultAlbumArt;
