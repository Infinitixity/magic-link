import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { AppTheme } from '../theme';

interface AmbientGlowProps {
  theme: AppTheme;
}

function GlowPatch({ top, left, width, height, color, opacity, rotate = '0deg' }: {
  top: number;
  left: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  rotate?: string;
}) {
  return (
    <View
      style={[
        styles.patch,
        {
          top,
          left,
          width,
          height,
          borderRadius: Math.max(width, height),
          backgroundColor: color,
          opacity,
          transform: [{ rotate }]
        }
      ]}
    />
  );
}

export function AmbientGlow({ theme }: AmbientGlowProps) {
  const { width, height } = useWindowDimensions();

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.baseTint, { backgroundColor: theme.bg }]} />
      <GlowPatch
        top={-height * 0.18}
        left={-width * 0.28}
        width={width * 0.95}
        height={height * 0.34}
        color={theme.accent}
        opacity={0.08}
        rotate="-12deg"
      />
      <GlowPatch
        top={height * 0.06}
        left={width * 0.62}
        width={width * 0.72}
        height={height * 0.28}
        color={theme.accent2}
        opacity={0.06}
        rotate="18deg"
      />
      <GlowPatch
        top={height * 0.48}
        left={-width * 0.18}
        width={width * 0.62}
        height={height * 0.24}
        color={theme.accent}
        opacity={0.035}
        rotate="10deg"
      />
      <GlowPatch
        top={height * 0.72}
        left={width * 0.48}
        width={width * 0.78}
        height={height * 0.24}
        color={theme.line}
        opacity={0.16}
        rotate="-8deg"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  baseTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  patch: {
    position: 'absolute',
  },
});
