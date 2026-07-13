import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AmbientGlow } from './src/components/AmbientGlow';
import { ChatPanel } from './src/components/ChatPanel';
import { InviteModal } from './src/components/InviteModal';
import { JoinModalControlled } from './src/components/JoinModal';
import { RadarPanel } from './src/components/RadarPanel';
import { RadioConsole } from './src/components/RadioConsole';
import { SettingsModal } from './src/components/SettingsModal';
import { SidePanel } from './src/components/SidePanel';
import { Toast } from './src/components/Toast';
import { TopBar } from './src/components/TopBar';
import { useMagicLinkSocket } from './src/hooks/useMagicLinkSocket';
import { getTheme } from './src/theme';
import type { AppMode, Preferences } from './src/types';
import { DEFAULT_SERVER_URL } from './src/config';
import { cleanName } from './src/utils/identity';
import {
  clearLocalData,
  loadPreferences,
  loadSavedName,
  loadServerUrl,
  saveName,
  savePreferences,
  saveServerUrl
} from './src/utils/storage';

export default function App() {
  const [mode, setMode] = useState<AppMode>('radar');
  const [privateInvite, setPrivateInvite] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [settingsName, setSettingsName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [serverReady, setServerReady] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    theme: 'dark',
    compactMessages: false,
    reduceMotion: false
  });
  const [toast, setToast] = useState<string | null>(null);
  const screenAnim = useRef(new Animated.Value(1)).current;

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    Promise.all([loadServerUrl(), loadPreferences(), loadSavedName()])
      .then(([savedServer, savedPreferences, savedName]) => {
        setServerUrl(savedServer);
        setPreferences(savedPreferences);
        setJoinName(savedName);
        setSettingsName(savedName);
      })
      .catch(() => {
        setServerUrl(DEFAULT_SERVER_URL);
      })
      .finally(() => {
        setServerReady(true);
      });
  }, []);

  const theme = useMemo(() => getTheme(preferences.theme), [preferences.theme]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const socket = useMagicLinkSocket({
    serverUrl,
    enabled: serverReady && Boolean(serverUrl),
    onToast: showToast
  });

  const connected = socket.connectionState === 'online';

  useEffect(() => {
    if (preferences.reduceMotion) {
      screenAnim.setValue(1);
      return;
    }

    screenAnim.setValue(0);
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [mode, preferences.reduceMotion, screenAnim]);

  const screenAnimatedStyle = {
    opacity: screenAnim,
    transform: [
      {
        translateY: screenAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0]
        })
      },
      {
        scale: screenAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1]
        })
      }
    ]
  };

  useEffect(() => {
    if (socket.needsJoin && !joinName) {
      loadSavedName().then(setJoinName);
    }
  }, [joinName, socket.needsJoin]);

  const handleJoin = async (value: string) => {
    const username = cleanName(value);
    if (!username) {
      showToast('Choose a name to enter the radar.');
      return;
    }

    setJoinName(username);

    if (!connected) {
      socket.actions.reconnect();
    }

    await socket.actions.join(username);
  };

  const handleSaveSettings = async () => {
    const username = cleanName(settingsName);
    if (!username) {
      showToast('Choose a display name.');
      return;
    }

    const nextServer = await saveServerUrl(serverUrl);
    await saveName(username);
    await savePreferences(preferences);
    setJoinName(username);
    setServerUrl(nextServer);
    setSettingsOpen(false);
    showToast('Settings saved');

    if (connected) {
      await socket.actions.join(username);
    }
  };

  const handleClearDevice = () => {
    Alert.alert(
      'Clear this device',
      'Clear your saved name, server URL, and preferences on this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearLocalData();
            setJoinName('');
            setSettingsName('');
            setPreferences({
              theme: 'dark',
              compactMessages: false,
              reduceMotion: false
            });
            setSettingsOpen(false);
            showToast('Local data cleared');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={preferences.theme === 'light' ? 'dark-content' : 'light-content'} />
        <View style={styles.shell}>
          <AmbientGlow theme={theme} />
          <TopBar
            theme={theme}
            mode={mode}
            connectionState={socket.connectionState}
            onModeChange={setMode}
            onOpenSettings={() => {
              setSettingsName(joinName || socket.me?.username || '');
              setSettingsOpen(true);
            }}
            onReconnect={socket.actions.reconnect}
          />

          {serverReady && !connected && socket.connectionState !== 'connecting' ? (
            <Pressable style={styles.offlineBanner} onPress={socket.actions.reconnect}>
              <Text style={styles.offlineTitle}>Server offline</Text>
              <Text style={styles.offlineBody}>
                Your Pi is off or unreachable. Turn it on, then tap here to retry. Server: {serverUrl}
              </Text>
            </Pressable>
          ) : null}

          <Animated.View style={[styles.screenHost, screenAnimatedStyle]}>
            {mode === 'radar' ? (
              <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                <RadarPanel
                  theme={theme}
                  reduceMotion={preferences.reduceMotion}
                  me={socket.me}
                  users={socket.onlineUsers}
                  privateInvite={privateInvite}
                  onPrivateInviteChange={setPrivateInvite}
                  onInviteUser={(userId) => socket.actions.requestRoom(userId, privateInvite)}
                />
                <SidePanel
                  theme={theme}
                  rooms={socket.roomList}
                  currentRoom={socket.currentRoom}
                  currentRoomId={socket.currentRoomId}
                  socketId={socket.socketId}
                  connected={connected}
                  onRefresh={socket.actions.refreshRadar}
                  onOpenRoom={socket.actions.openRoom}
                  onKick={(roomId, targetId) => socket.actions.removeMember(roomId, targetId, false)}
                  onBan={(roomId, targetId) => socket.actions.removeMember(roomId, targetId, true)}
                />
                <ChatPanel
                  theme={theme}
                  compactMessages={preferences.compactMessages}
                  room={socket.currentRoom}
                  connected={connected}
                  socketId={socket.socketId}
                  onSend={socket.actions.sendMessage}
                  onInvite={socket.actions.prepareInviteFromCurrentRoom}
                />
              </ScrollView>
            ) : (
              <View style={styles.radioContent}>
                <RadioConsole
                  theme={theme}
                  connected={connected}
                  radio={socket.radio}
                  onTogglePower={() => {
                    if (socket.radio.enabled) {
                      socket.actions.disableRadio();
                    } else {
                      socket.actions.enableRadio();
                    }
                  }}
                  onSelectChannel={socket.actions.selectRadioChannel}
                  onPressInPtt={socket.actions.startTransmitting}
                  onPressOutPtt={socket.actions.stopTransmitting}
                  onVolumeChange={socket.actions.setVolume}
                />
              </View>
            )}
          </Animated.View>
        </View>

        <JoinModalControlled
          visible={socket.needsJoin || !socket.me}
          theme={theme}
          value={joinName}
          onChange={setJoinName}
          onSubmit={handleJoin}
          connectionState={socket.connectionState}
        />

        <SettingsModal
          visible={settingsOpen}
          theme={theme}
          name={settingsName}
          serverUrl={serverUrl}
          preferences={preferences}
          onChangeName={setSettingsName}
          onChangeServerUrl={setServerUrl}
          onChangePreferences={setPreferences}
          onSave={handleSaveSettings}
          onClear={handleClearDevice}
          onClose={() => setSettingsOpen(false)}
        />

        <InviteModal
          visible={Boolean(socket.pendingInvite)}
          theme={theme}
          invite={socket.pendingInvite}
          onAccept={socket.actions.acceptInvite}
          onDecline={socket.actions.declineInvite}
        />

        <Toast theme={theme} message={toast} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function createStyles(theme: ReturnType<typeof getTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg
    },
    shell: {
      flex: 1
    },
    screenHost: {
      flex: 1
    },
    content: {
      padding: 12,
      gap: 12,
      paddingBottom: 40
    },
    radioContent: {
      flex: 1,
      padding: 8
    },
    offlineBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      gap: 4
    },
    offlineTitle: {
      color: theme.danger,
      fontWeight: '800'
    },
    offlineBody: {
      color: theme.muted,
      lineHeight: 18,
      fontSize: 13
    }
  });
}
