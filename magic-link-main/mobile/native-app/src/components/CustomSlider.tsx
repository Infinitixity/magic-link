import { useCallback, useRef } from 'react';
import { PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { AppTheme } from '../theme';

interface CustomSliderProps {
  theme: AppTheme;
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
}

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 22;

export function CustomSlider({ theme, minimumValue, maximumValue, step, value, onValueChange }: CustomSliderProps) {
  const { width: screenWidth } = useWindowDimensions();
  const trackRef = useRef<number>(screenWidth - 40);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clamp = useCallback((val: number) => {
    const stepped = Math.round((val - minimumValue) / step) * step + minimumValue;
    return Math.min(maximumValue, Math.max(minimumValue, stepped));
  }, [minimumValue, maximumValue, step]);

  const fraction = (value - minimumValue) / (maximumValue - minimumValue);
  const thumbLeft = fraction * (trackRef.current - THUMB_SIZE);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        trackRef.current = evt.nativeEvent.locationX * 2 + 40;
      },
      onPanResponderMove: (evt) => {
        const trackWidth = trackRef.current;
        const x = evt.nativeEvent.locationX;
        const rawFraction = Math.max(0, Math.min(1, x / trackWidth));
        const rawVal = minimumValue + rawFraction * (maximumValue - minimumValue);
        onValueChange(clamp(rawVal));
      },
    })
  ).current;

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => { trackRef.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      <View style={[styles.track, { backgroundColor: theme.surface2 }]}>
        <View
          style={[
            styles.trackFill,
            {
              width: `${fraction * 100}%`,
              backgroundColor: theme.accent,
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.thumb,
          {
            left: thumbLeft,
            backgroundColor: theme.accent,
            borderColor: theme.bg,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 42,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: 999,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 999,
  },
    thumb: {
      position: 'absolute',
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      borderWidth: 2,
      top: (42 - THUMB_SIZE) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
