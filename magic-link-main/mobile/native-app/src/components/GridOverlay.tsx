import React from 'react';
import { StyleSheet, View } from 'react-native';

interface GridOverlayProps {
  spacing: number;
  opacity?: number;
  color?: string;
}

export function GridOverlay({ spacing, opacity = 0.06, color = 'rgba(86,240,192,0.06)' }: GridOverlayProps) {
  const alpha = typeof opacity === 'number' ? opacity : 0.06;
  const bgColor = `rgba(86,240,192,${alpha})`;

  const lines: React.ReactElement[] = [];
  for (let i = 1; i <= 10; i++) {
    const pos = i * spacing;
    lines.push(
      <View key={`h${i}`} style={[styles.hLine, { top: pos }, { backgroundColor: bgColor }]} />,
      <View key={`v${i}`} style={[styles.vLine, { left: pos }, { backgroundColor: bgColor }]} />
    );
  }

  return <View style={styles.container} pointerEvents="none">{lines}</View>;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  hLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  vLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
});
