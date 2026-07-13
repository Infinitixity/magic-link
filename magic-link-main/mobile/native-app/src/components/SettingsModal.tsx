import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { DEFAULT_SERVER_URL, LOCAL_PI_URL } from '../config';
import type { AppTheme } from '../theme';
import type { Preferences } from '../types';

interface SettingsModalProps {
  visible: boolean;
  theme: AppTheme;
  name: string;
  serverUrl: string;
  preferences: Preferences;
  onChangeName: (value: string) => void;
  onChangeServerUrl: (value: string) => void;
  onChangePreferences: (value: Preferences) => void;
  onSave: () => void;
  onClear: () => void;
  onClose: () => void;
}

export function SettingsModal({
  visible,
  theme,
  name,
  serverUrl,
  preferences,
  onChangeName,
  onChangeServerUrl,
  onChangePreferences,
  onSave,
  onClear,
  onClose
}: SettingsModalProps) {
  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Preferences</Text>
          <Text style={styles.title}>Settings</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={onChangeName}
              placeholder="Your name"
              placeholderTextColor={theme.muted}
              maxLength={24}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={onChangeServerUrl}
              placeholder={DEFAULT_SERVER_URL}
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.quickUrls}>
              <Pressable style={styles.quickButton} onPress={() => onChangeServerUrl(DEFAULT_SERVER_URL)}>
                <Text style={styles.quickButtonText}>Cloudflare</Text>
              </Pressable>
              <Pressable style={styles.quickButton} onPress={() => onChangeServerUrl(LOCAL_PI_URL)}>
                <Text style={styles.quickButtonText}>Pi hotspot</Text>
              </Pressable>
            </View>
          </View>

          <SettingRow
            theme={theme}
            label="Light mode"
            value={preferences.theme === 'light'}
            onValueChange={(value) =>
              onChangePreferences({ ...preferences, theme: value ? 'light' : 'dark' })
            }
          />
          <SettingRow
            theme={theme}
            label="Compact messages"
            value={preferences.compactMessages}
            onValueChange={(value) => onChangePreferences({ ...preferences, compactMessages: value })}
          />
          <SettingRow
            theme={theme}
            label="Reduce motion"
            value={preferences.reduceMotion}
            onValueChange={(value) => onChangePreferences({ ...preferences, reduceMotion: value })}
          />

          <View style={styles.actions}>
            <Pressable style={styles.dangerButton} onPress={onClear}>
              <Text style={styles.dangerButtonText}>Clear this device</Text>
            </Pressable>
            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryButton} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={onSave}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SettingRow({
  theme,
  label,
  value,
  onValueChange
}: {
  theme: AppTheme;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const styles = createStyles(theme);

  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.surface2, true: theme.accent }}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(1, 8, 10, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 18
    },
    card: {
      width: '100%',
      maxWidth: 500,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: 24,
      gap: 14,
      ...theme.shadow
    },
    eyebrow: {
      color: theme.muted,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      fontSize: 11
    },
    title: {
      color: theme.text,
      fontSize: 24,
      fontWeight: '700'
    },
    field: {
      gap: 7
    },
    label: {
      color: theme.muted,
      fontSize: 13
    },
    input: {
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      color: theme.text,
      paddingHorizontal: 14
    },
    quickUrls: {
      flexDirection: 'row',
      gap: 8
    },
    quickButton: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2
    },
    quickButtonText: {
      color: theme.text,
      fontSize: 12
    },
    settingRow: {
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14
    },
    settingLabel: {
      color: theme.muted,
      fontSize: 13
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      marginTop: 8
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10
    },
    dangerButton: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      justifyContent: 'center'
    },
    dangerButtonText: {
      color: theme.text,
      fontWeight: '800',
      fontSize: 13
    },
    secondaryButton: {
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      justifyContent: 'center'
    },
    secondaryButtonText: {
      color: theme.text,
      fontWeight: '800'
    },
    primaryButton: {
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.accent,
      justifyContent: 'center'
    },
    primaryButtonText: {
      color: '#052118',
      fontWeight: '800'
    }
  });
}
