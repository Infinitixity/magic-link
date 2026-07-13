import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';

interface GridOverlayProps {
  spacing: number;
  opacity?: number;
  color?: string;
}

export function GridOverlay({ spacing, opacity = 0.06, color }: GridOverlayProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const alpha = typeof opacity === 'number' ? opacity : 0.06;
  const bgColor = color || `rgba(86,240,192,${alpha})`;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const lines = useMemo(() => {
    if (!size.width || !size.height || spacing <= 0) {
      return [];
    }

    const nextLines: JSX.Element[] = [];
    const horizontalCount = Math.ceil(size.height / spacing);
    const verticalCount = Math.ceil(size.width / spacing);

    for (let i = 1; i < horizontalCount; i++) {
      nextLines.push(
        <View key={`h${i}`} style={[styles.hLine, { top: i * spacing, backgroundColor: bgColor }]} />
      );
    }

    for (let i = 1; i < verticalCount; i++) {
      nextLines.push(
        <View key={`v${i}`} style={[styles.vLine, { left: i * spacing, backgroundColor: bgColor }]} />
      );
    }

    return nextLines;
  }, [bgColor, size.height, size.width, spacing]);

  return (
    <View style={styles.container} onLayout={onLayout} pointerEvents="none">
      {lines}
    </View>
  );
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
