import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import type { AppTheme } from '../theme';

interface AmbientGlowProps {
  theme: AppTheme;
}

const { width: W, height: H } = Dimensions.get('window');

function GradientCircles({ cx, cy, radius, color, peakOpacity }: {
  cx: number;
  cy: number;
  radius: number;
  color: string;
  peakOpacity: number;
}) {
  const layers: React.ReactElement[] = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const size = radius * 2 * (1 - t * 0.85);
    const opacity = peakOpacity * (1 - t * t);
    layers.push(
      <View
        key={i}
        style={{
          position: 'absolute',
          top: cy - size / 2,
          left: cx - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: opacity,
        }}
      />
    );
  }
  return <>{layers}</>;
}

export function AmbientGlow({ theme }: AmbientGlowProps) {
  const greenCx = W * 0.14;
  const greenCy = H * 0.10;
  const yellowCx = W * 0.84;
  const yellowCy = H * 0.14;

  return (
    <View style={styles.container} pointerEvents="none">
      <GradientCircles
        cx={greenCx}
        cy={greenCy}
        radius={W * 0.5}
        color={theme.accent}
        peakOpacity={0.14}
      />
      <GradientCircles
        cx={yellowCx}
        cy={yellowCy}
        radius={W * 0.42}
        color={theme.accent2}
        peakOpacity={0.12}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
