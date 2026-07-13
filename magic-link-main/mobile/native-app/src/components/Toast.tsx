import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import type { AppTheme } from '../theme';

interface ToastProps {
  theme: AppTheme;
  message: string | null;
}

export function Toast({ theme, message }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const styles = createStyles(theme);

  useEffect(() => {
    if (!message) {
      opacity.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true })
    ]).start();
  }, [message, opacity]);

  if (!message) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      right: 18,
      bottom: 18,
      maxWidth: 360,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: theme.text,
      zIndex: 30,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 24
    },
    text: {
      color: theme.bg,
      fontWeight: '600',
      fontSize: 13
    }
  });
}
