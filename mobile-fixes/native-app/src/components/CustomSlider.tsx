import { useCallback, useMemo, useRef, useState } from 'react';
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
  const wrapperRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(Math.max(1, screenWidth - 40));
  const trackWidthRef = useRef(Math.max(1, screenWidth - 40));
  const trackLeftRef = useRef(0);
  const latest = useRef({ minimumValue, maximumValue, step, onValueChange });
  latest.current = { minimumValue, maximumValue, step, onValueChange };

  const valueFromPageX = useCallback((pageX: number) => {
    const { minimumValue: min, maximumValue: max, step: nextStep } = latest.current;
    const width = Math.max(1, trackWidthRef.current);
    const x = pageX - trackLeftRef.current;
    const rawFraction = Math.max(0, Math.min(1, x / width));
    const rawValue = min + rawFraction * (max - min);
    const stepped = Math.round((rawValue - min) / nextStep) * nextStep + min;
    return Math.min(max, Math.max(min, stepped));
  }, []);

  const updateBounds = useCallback((then?: () => void) => {
    wrapperRef.current?.measureInWindow((x, _y, width) => {
      trackLeftRef.current = x;
      trackWidthRef.current = Math.max(1, width);
      setTrackWidth(Math.max(1, width));
      then?.();
    });
  }, []);

  const fraction = useMemo(() => {
    if (maximumValue === minimumValue) {
      return 0;
    }

    return Math.max(0, Math.min(1, (value - minimumValue) / (maximumValue - minimumValue)));
  }, [maximumValue, minimumValue, value]);
  const thumbLeft = fraction * Math.max(0, trackWidth - THUMB_SIZE);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const pageX = evt.nativeEvent.pageX;
        updateBounds(() => {
          latest.current.onValueChange(valueFromPageX(pageX));
        });
      },
      onPanResponderMove: (evt) => {
        latest.current.onValueChange(valueFromPageX(evt.nativeEvent.pageX));
      },
    })
  ).current;

  return (
    <View
      ref={wrapperRef}
      style={styles.wrapper}
      onLayout={(e) => {
        const nextWidth = Math.max(1, e.nativeEvent.layout.width);
        trackWidthRef.current = nextWidth;
        setTrackWidth(nextWidth);
        updateBounds();
      }}
      {...panResponder.panHandlers}
    >
      <View pointerEvents="none" style={[styles.track, { backgroundColor: theme.surface2 }]}>
        <View
          pointerEvents="none"
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
        pointerEvents="none"
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
