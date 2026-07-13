import { useCallback, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
}

export function RadioConsole({
  theme,
  connected,
  radio,
  onTogglePower,
  onSelectChannel,
  onPressInPtt,
  onPressOutPtt
}: RadioConsoleProps) {
  const { height: windowHeight } = useWindowDimensions();
  const styles = createStyles(theme);
  const channelInfo = radio.activeChannels.find((item) => item.channel === radio.channel);
  const listeners = channelInfo?.listeners || (radio.enabled ? 1 : 0);

  const handleSliderChange = useCallback((value: number) => {
    onSelectChannel(Math.round(value));
  }, [onSelectChannel]);

  return (
    <View style={styles.console}>
      <GridOverlay spacing={36} opacity={0.05} />
      <View style={styles.statusBar}>
        <View style={[styles.micStatus, radio.micStatus === 'transmitting' && styles.micTransmitting, radio.micStatus === 'receiving' && styles.micReceiving]}>
          <Text style={[styles.micText, radio.micStatus === 'transmitting' && styles.micTextDanger, radio.micStatus === 'receiving' && styles.micTextAccent]}>
            {radio.micLabel}
          </Text>
        </View>
        <Text style={styles.statusCenter}>{radio.enabled ? 'RADIO ON' : 'RADIO OFF'}</Text>
        <Text style={styles.statusRight}>
          {listeners} LISTENER{listeners === 1 ? '' : 'S'}
        </Text>
      </View>

      <View style={styles.display}>
        <Text style={styles.displayEyebrow}>Current channel</Text>
        <Text style={styles.displayChannel}>{formatChannel(radio.channel)}</Text>
        <Text style={styles.displayState}>{channelInfo ? 'ACTIVE' : 'CLOSED'}</Text>
      </View>

      <View style={styles.tunerWrap}>
        <Text style={styles.tunerLabel}>CHANNEL {formatChannel(radio.channel)}</Text>
        <CustomSlider
          theme={theme}
          minimumValue={1}
          maximumValue={100}
          step={1}
          value={radio.channel}
          onValueChange={handleSliderChange}
        />
        <View style={styles.scale}>
          <Text style={[styles.scaleMark, radio.channel === 1 && styles.scaleMarkActive]}>001</Text>
          <Text style={[styles.scaleMark, radio.channel === 25 && styles.scaleMarkActive]}>025</Text>
          <Text style={[styles.scaleMark, radio.channel === 50 && styles.scaleMarkActive]}>050</Text>
          <Text style={[styles.scaleMark, radio.channel === 75 && styles.scaleMarkActive]}>075</Text>
          <Text style={[styles.scaleMark, radio.channel === 100 && styles.scaleMarkActive]}>100</Text>
        </View>
      </View>

      <View style={styles.activeSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active channels</Text>
          <Text style={styles.count}>{radio.activeChannels.length}</Text>
        </View>
        <ScrollView style={styles.activeScrollView} contentContainerStyle={styles.activeList}>
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
                <Text style={styles.activeChannel}>CH {formatChannel(item.channel)}</Text>
                <Text style={styles.activeListeners}>
                  {item.listeners} listener{item.listeners === 1 ? '' : 's'}
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
          <Text style={[styles.powerText, radio.enabled && styles.powerTextActive]}>
            {radio.enabled ? 'Radio on' : 'Radio off'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.pttButton, radio.transmitting && styles.pttButtonActive]}
          disabled={!radio.enabled || !connected}
          onPressIn={onPressInPtt}
          onPressOut={onPressOutPtt}
        >
          <Text style={styles.pttTitle}>HOLD TO TALK</Text>
          <Text style={styles.pttSubtitle}>Release to mute</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    console: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 20,
      gap: 18,
      overflow: 'hidden',
      ...theme.shadow
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12
    },
    micStatus: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2
    },
    micTransmitting: {
      backgroundColor: theme.danger,
      borderColor: 'transparent',
      shadowColor: 'rgba(255, 107, 107, 0.38)',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 24,
      shadowOpacity: 1,
      elevation: 6,
    },
    micReceiving: {
      backgroundColor: theme.accent2,
      borderColor: 'transparent'
    },
    micText: {
      color: theme.muted,
      fontSize: 11,
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
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textAlign: 'center',
      flex: 1,
      fontFamily: 'monospace'
    },
    statusRight: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textAlign: 'right',
      fontFamily: 'monospace'
    },
    display: {
      minHeight: 190,
      borderWidth: 1,
      borderColor: 'rgba(86, 240, 192, 0.32)',
      borderRadius: 14,
      backgroundColor: '#031915',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: 'rgba(86, 240, 192, 0.1)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 42,
      elevation: 8
    },
    displayEyebrow: {
      color: '#56bca0',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1
    },
    displayChannel: {
      color: '#8dffda',
      fontSize: 72,
      fontWeight: '800',
      lineHeight: 72,
      textShadowColor: 'rgba(86, 240, 192, 0.34)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 26,
      fontFamily: 'monospace',
      letterSpacing: -2
    },
    displayState: {
      color: theme.accent2,
      fontWeight: '800',
      letterSpacing: 1,
      fontFamily: 'monospace'
    },
    tunerWrap: {
      gap: 9
    },
    tunerLabel: {
      color: theme.text,
      textAlign: 'center',
      fontWeight: '800',
      fontFamily: 'monospace'
    },
    scale: {
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    scaleMark: {
      color: theme.muted,
      fontSize: 11,
      fontFamily: 'monospace'
    },
    scaleMarkActive: {
      color: theme.accent,
      fontWeight: '800'
    },
    activeSection: {
      flex: 1,
      gap: 10,
      minHeight: 100
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    sectionTitle: {
      color: theme.text,
      fontWeight: '700'
    },
    count: {
      color: theme.muted
    },
    activeScrollView: {
      flex: 1
    },
    activeList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      flexGrow: 1
    },
    emptyState: {
      minHeight: 80,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.line,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      width: '100%'
    },
    emptyText: {
      color: theme.muted,
      fontSize: 13,
      textAlign: 'center'
    },
    activeItem: {
      minWidth: 130,
      minHeight: 56,
      padding: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      gap: 3
    },
    activeItemSelected: {
      borderColor: theme.accent,
      borderLeftWidth: 4,
      paddingLeft: 6
    },
    activeChannel: {
      color: theme.text,
      fontWeight: '800'
    },
    activeListeners: {
      color: theme.muted,
      fontSize: 12
    },
    controls: {
      flexDirection: 'row',
      gap: 12
    },
    powerButton: {
      flex: 0.34,
      minHeight: 76,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      alignItems: 'center',
      justifyContent: 'center'
    },
    powerButtonActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent
    },
    powerText: {
      color: theme.muted,
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    powerTextActive: {
      color: '#052118'
    },
    pttButton: {
      flex: 1,
      minHeight: 76,
      borderRadius: 14,
      backgroundColor: theme.accent2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    pttButtonActive: {
      backgroundColor: theme.danger,
      transform: [{ scale: 0.985 }]
    },
    pttTitle: {
      color: '#241700',
      fontWeight: '900',
      textTransform: 'uppercase'
    },
    pttSubtitle: {
      color: '#241700',
      opacity: 0.7,
      fontSize: 11
    }
  });
}
