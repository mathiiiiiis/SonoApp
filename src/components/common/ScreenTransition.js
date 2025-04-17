import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

const ScreenTransition = ({ children, type = 'fade' }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    const animations = [];

    if (type === 'fade' || type === 'both') {
      animations.push(
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      );
    }

    if (type === 'slide' || type === 'both') {
      animations.push(
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  }, [fadeAnim, slideAnim, type]);

  const getAnimatedStyle = () => {
    const style = {};

    if (type === 'fade' || type === 'both') {
      style.opacity = fadeAnim;
    }

    if (type === 'slide' || type === 'both') {
      style.transform = [{ translateY: slideAnim }];
    }

    return style;
  };

  return (
    <Animated.View style={[styles.container, getAnimatedStyle()]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenTransition;
