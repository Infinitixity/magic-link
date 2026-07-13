import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '../theme';
import type { AppMode, ConnectionState } from '../types';

interface TopBarProps {
  theme: AppTheme;
  mode: AppMode;
  connectionState: ConnectionState;
  onModeChange: (mode: AppMode) => void;
  onOpenSettings: () => void;
}

function connectionLabel(state: ConnectionState): string {
  if (state === 'online') return 'Online';
  if (state === 'reconnecting') return 'Reconnecting';
  if (state === 'connecting') return 'Connecting';
  return 'Offline';
}

export function TopBar({
  theme,
  mode,
  connectionState,
  onModeChange,
  onOpenSettings
}: TopBarProps) {
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo as any}
          resizeMode="cover"
        />
      </View>

      <View style={styles.actions}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, mode === 'radar' && styles.tabActive]}
            onPress={() => onModeChange('radar')}
          >
            <Text style={[styles.tabText, mode === 'radar' && styles.tabTextActive]}>Radar</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === 'radio' && styles.tabActive]}
            onPress={() => onModeChange('radio')}
          >
            <Text style={[styles.tabText, mode === 'radio' && styles.tabTextActive]}>Radio</Text>
          </Pressable>
        </View>

        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              connectionState === 'offline' && styles.statusDotOffline,
              connectionState === 'reconnecting' && styles.statusDotReconnecting
            ]}
          />
          <Text style={styles.statusText}>{connectionLabel(connectionState)}</Text>
        </View>

        <Pressable style={styles.iconButton} onPress={onOpenSettings}>
          <Text style={styles.iconButtonText}>⚙</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      height: 72,
      paddingHorizontal: 22,
      borderBottomWidth: 1,
      borderBottomColor: theme.line,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.bg + 'b7'
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1
    },
    logo: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    tabs: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2
    },
    tab: {
      minHeight: 30,
      paddingHorizontal: 12,
      borderRadius: 8,
      justifyContent: 'center'
    },
    tabActive: {
      backgroundColor: theme.accent
    },
    tabText: {
      color: theme.muted,
      fontWeight: '700',
      fontSize: 13
    },
    tabTextActive: {
      color: '#052118'
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.line,
      flexShrink: 1
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 7,
      backgroundColor: theme.accent
    },
    statusDotOffline: {
      backgroundColor: theme.danger
    },
    statusDotReconnecting: {
      backgroundColor: theme.accent2
    },
    statusText: {
      color: theme.muted,
      fontSize: 12
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      alignItems: 'center',
      justifyContent: 'center'
    },
    iconButtonText: {
      color: theme.text,
      fontSize: 16
    }
  });
}
