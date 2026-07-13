import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CustomSlider } from './CustomSlider';
import { GridOverlay } from './GridOverlay';
import type { AppTheme } from '../theme';
import type { RadioState } from '../types';
import { formatChannel } from '../utils/identity';

interface RadioConsoleProps {
  theme: AppTheme;
  connected: boolean;
  radio: RadioState;
  onTogglePower: () => void;
  onSelectChannel: (channel: number) => void;
  onPressInPtt: () => void;
  onPressOutPtt: () => void;
  onVolumeChange: (volume: number) => void;
}

export function RadioConsole({
  theme,
  connected,
  radio,
  onTogglePower,
  onSelectChannel,
  onPressInPtt,
  onPressOutPtt,
  onVolumeChange
}: RadioConsoleProps) {
  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < 780;
  const styles = createStyles(theme, compact);
  const channelInfo = radio.activeChannels.find((item) => item.channel === radio.channel);
  const listeners = channelInfo?.listeners || (radio.enabled ? 1 : 0);
  const signalPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!radio.enabled) {
      signalPulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(signalPulse, {
          toValue: 1,
          duration: radio.transmitting || radio.micStatus === 'receiving' ? 780 : 1700,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(signalPulse, {
          toValue: 0,
          duration: radio.transmitting || radio.micStatus === 'receiving' ? 520 : 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true
        })
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [radio.enabled, radio.micStatus, radio.transmitting, signalPulse]);

  const glowOpacity = signalPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [radio.enabled ? 0.12 : 0.03, radio.transmitting || radio.micStatus === 'receiving' ? 0.52 : 0.28]
  });
  const glowScale = signalPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.16]
  });

  const handleSliderChange = useCallback((value: number) => {
    onSelectChannel(Math.round(value));
  }, [onSelectChannel]);

  const handleVolumeChange = useCallback((value: number) => {
    onVolumeChange(Math.round(value));
  }, [onVolumeChange]);

  return (
    <View style={styles.console}>
      <GridOverlay spacing={compact ? 28 : 36} opacity={0.05} />

      <View style={styles.statusBar}>
        <View style={[
          styles.micStatus,
          radio.micStatus === 'transmitting' && styles.micTransmitting,
          radio.micStatus === 'receiving' && styles.micReceiving
        ]}>
          <Text
            numberOfLines={1}
            style={[
              styles.micText,
              radio.micStatus === 'transmitting' && styles.micTextDanger,
          radio.micStatus === 'receiving' && styles.micTextAccent
            ]}
          >
            {radio.muted ? 'MUTED' : radio.micLabel}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.statusCenter}>{radio.enabled ? 'RADIO ON' : 'RADIO OFF'}</Text>
        <Text numberOfLines={1} style={styles.statusRight}>
          {listeners} USER{listeners === 1 ? '' : 'S'}
        </Text>
      </View>

      <View style={styles.display}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.displayGlow,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }]
            }
          ]}
        />
        {!compact ? <Text style={styles.displayEyebrow}>Current channel</Text> : null}
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.displayChannel}>
          {formatChannel(radio.channel)}
        </Text>
        <Text numberOfLines={1} style={styles.displayState}>{channelInfo ? 'ACTIVE' : 'CLOSED'}</Text>
      </View>

      <View style={styles.tunerWrap}>
        <Text numberOfLines={1} style={styles.tunerLabel}>CH {formatChannel(radio.channel)}</Text>
        <CustomSlider
          theme={theme}
          minimumValue={1}
          maximumValue={100}
          step={1}
          value={radio.channel}
          onValueChange={handleSliderChange}
        />
        <View style={styles.scale}>
          <Text style={styles.scaleMark}>001</Text>
          <Text style={styles.scaleMark}>025</Text>
          <Text style={styles.scaleMark}>050</Text>
          <Text style={styles.scaleMark}>075</Text>
          <Text style={styles.scaleMark}>100</Text>
        </View>
      </View>

      <View style={styles.activeSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active channels</Text>
          <Text style={styles.count}>{radio.activeChannels.length}</Text>
        </View>
        <ScrollView
          horizontal={compact}
          style={styles.activeScrollView}
          contentContainerStyle={styles.activeList}
          showsHorizontalScrollIndicator={false}
        >
          {radio.activeChannels.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No active channels</Text>
            </View>
          ) : (
            radio.activeChannels.map((item) => (
              <Pressable
                key={item.channel}
                style={[styles.activeItem, item.channel === radio.channel && styles.activeItemSelected]}
                onPress={() => onSelectChannel(item.channel)}
              >
                <Text numberOfLines={1} style={styles.activeChannel}>CH {formatChannel(item.channel)}</Text>
                <Text numberOfLines={1} style={styles.activeListeners}>
                  {item.listeners} user{item.listeners === 1 ? '' : 's'}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.powerButton, radio.enabled && styles.powerButtonActive]}
          onPress={onTogglePower}
        >
          <Text style={[styles.powerMain, radio.enabled && styles.powerMainActive]}>
            {radio.enabled ? 'ON' : 'OFF'}
          </Text>
          <Text style={[styles.powerLabel, radio.enabled && styles.powerMainActive]}>RADIO</Text>
        </Pressable>

        <Pressable
          style={[styles.pttButton, radio.transmitting && styles.pttButtonActive]}
          disabled={!radio.enabled || radio.muted || !connected}
          onPressIn={onPressInPtt}
          onPressOut={onPressOutPtt}
        >
          <Text style={styles.pttTitle}>HOLD TO TALK</Text>
          <Text style={styles.pttSub}>{radio.muted ? 'admin muted' : radio.enabled ? 'release to mute' : 'radio off'}</Text>
        </Pressable>
      </View>

      {!compact ? (
        <View style={styles.volumeSection}>
          <View style={styles.volumeHeader}>
            <Text style={styles.volumeLabel}>VOLUME</Text>
            <Text style={styles.volumeValue}>{radio.volume}%</Text>
          </View>
          <CustomSlider
            theme={theme}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={radio.volume}
            onValueChange={handleVolumeChange}
          />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme, compact: boolean) {
  return StyleSheet.create({
    console: {
      flex: compact ? 1 : undefined,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: compact ? 12 : 18,
      backgroundColor: theme.surface,
      padding: compact ? 9 : 20,
      gap: compact ? 8 : 18,
      overflow: 'hidden',
      ...theme.shadow
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 6 : 12
    },
    micStatus: {
      maxWidth: compact ? '42%' : undefined,
      paddingHorizontal: compact ? 7 : 10,
      paddingVertical: compact ? 5 : 7,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2
    },
    micTransmitting: {
      backgroundColor: theme.danger,
      borderColor: 'transparent',
      shadowColor: theme.danger,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
      elevation: 4
    },
    micReceiving: {
      backgroundColor: theme.accent2,
      borderColor: 'transparent',
      shadowColor: theme.accent2,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 3
    },
    micText: {
      color: theme.muted,
      fontSize: compact ? 9 : 11,
      fontWeight: '800',
      letterSpacing: 1,
      fontFamily: 'monospace'
    },
    micTextDanger: {
      color: '#250606'
    },
    micTextAccent: {
      color: '#052118'
    },
    statusCenter: {
      color: theme.muted,
      fontSize: compact ? 9 : 11,
      fontWeight: '800',
      letterSpacing: 1,
      textAlign: 'center',
      flex: 1,
      fontFamily: 'monospace'
    },
    statusRight: {
      color: theme.muted,
      fontSize: compact ? 9 : 11,
      fontWeight: '800',
      letterSpacing: 1,
      textAlign: 'right',
      fontFamily: 'monospace'
    },
    display: {
      height: compact ? 112 : undefined,
      minHeight: compact ? undefined : 190,
      borderWidth: 1,
      borderColor: 'rgba(86, 240, 192, 0.32)',
      borderRadius: compact ? 10 : 14,
      backgroundColor: '#031915',
      alignItems: 'center',
      justifyContent: 'center',
      gap: compact ? 2 : 6,
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.1,
      shadowRadius: 30,
      elevation: 3,
      overflow: 'hidden'
    },
    displayGlow: {
      position: 'absolute',
      width: compact ? 150 : 220,
      height: compact ? 150 : 220,
      borderRadius: compact ? 75 : 110,
      backgroundColor: theme.accent,
      opacity: 0.18
    },
    displayEyebrow: {
      color: '#56bca0',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1
    },
    displayChannel: {
      color: '#8dffda',
      fontSize: compact ? 80 : 72,
      fontWeight: '800',
      lineHeight: compact ? 82 : 72,
      fontFamily: 'monospace',
      letterSpacing: 0,
      includeFontPadding: false,
      textAlign: 'center',
      width: '100%',
      textShadowColor: 'rgba(86, 240, 192, 0.36)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 18
    },
    displayState: {
      color: theme.accent2,
      fontWeight: '800',
      fontSize: compact ? 11 : 14,
      letterSpacing: 1,
      fontFamily: 'monospace'
    },
    tunerWrap: {
      gap: compact ? 2 : 9
    },
    tunerLabel: {
      color: theme.text,
      textAlign: 'center',
      fontSize: compact ? 11 : 14,
      fontWeight: '800',
      fontFamily: 'monospace'
    },
    scale: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    scaleMark: {
      color: theme.muted,
      fontSize: compact ? 9 : 11,
      fontFamily: 'monospace'
    },
    activeSection: {
      flex: compact ? 1 : undefined,
      gap: compact ? 5 : 10,
      minHeight: compact ? 66 : 100
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    sectionTitle: {
      color: theme.text,
      fontWeight: '700',
      fontSize: compact ? 12 : 14
    },
    count: {
      color: theme.muted,
      fontSize: compact ? 12 : 14
    },
    activeScrollView: {
      flex: 1
    },
    activeList: {
      flexDirection: 'row',
      flexWrap: compact ? 'nowrap' : 'wrap',
      gap: compact ? 6 : 8,
      flexGrow: 1
    },
    emptyState: {
      minHeight: compact ? 42 : 80,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.line,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      padding: compact ? 8 : 18,
      width: compact ? 180 : '100%'
    },
    emptyText: {
      color: theme.muted,
      fontSize: compact ? 11 : 13,
      textAlign: 'center'
    },
    activeItem: {
      minWidth: compact ? 104 : 130,
      minHeight: compact ? 44 : 56,
      padding: compact ? 7 : 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      gap: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 10,
      elevation: 2
    },
    activeItemSelected: {
      borderColor: theme.accent,
      borderLeftWidth: 4,
      paddingLeft: compact ? 5 : 6,
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 14,
      elevation: 4
    },
    activeChannel: {
      color: theme.text,
      fontWeight: '800',
      fontSize: compact ? 12 : 14
    },
    activeListeners: {
      color: theme.muted,
      fontSize: compact ? 10 : 12
    },
    controls: {
      flexDirection: 'row',
      gap: compact ? 8 : 12
    },
    powerButton: {
      flex: 0.38,
      height: compact ? 74 : 76,
      borderRadius: compact ? 12 : 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 14,
      elevation: 3
    },
    powerButtonActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
      shadowColor: theme.accent,
      shadowOpacity: 0.22
    },
    powerMain: {
      color: theme.muted,
      fontWeight: '900',
      fontSize: compact ? 18 : 20
    },
    powerMainActive: {
      color: '#052118'
    },
    powerLabel: {
      color: theme.muted,
      fontWeight: '900',
      fontSize: 10
    },
    pttButton: {
      flex: 1,
      height: compact ? 74 : 76,
      borderRadius: compact ? 12 : 14,
      backgroundColor: theme.accent2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      shadowColor: theme.accent2,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 4
    },
    pttButtonActive: {
      backgroundColor: theme.danger,
      transform: [{ scale: 0.985 }],
      shadowColor: theme.danger,
      shadowOpacity: 0.32
    },
    pttTitle: {
      color: '#241700',
      fontWeight: '900',
      textTransform: 'uppercase',
      fontSize: compact ? 16 : 18
    },
    pttSub: {
      color: '#241700',
      opacity: 0.72,
      fontSize: 10,
      fontWeight: '700'
    },
    volumeSection: {
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.line,
      paddingTop: 16
    },
    volumeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    volumeLabel: {
      color: theme.text,
      fontWeight: '700',
      fontSize: 13
    },
    volumeValue: {
      color: theme.accent,
      fontWeight: '800'
    }
  });
}
