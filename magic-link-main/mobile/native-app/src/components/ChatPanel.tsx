import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { GridOverlay } from './GridOverlay';
import type { AppTheme } from '../theme';
import type { Message, Room } from '../types';
import { formatTime, identityForMessage, identityLabel } from '../utils/identity';
import { MAX_MESSAGE_LENGTH } from '../config';

interface ChatPanelProps {
  theme: AppTheme;
  compactMessages: boolean;
  room?: Room;
  connected: boolean;
  socketId: string | null;
  onSend: (text: string) => void;
  onInvite: () => void;
}

export function ChatPanel({
  theme,
  compactMessages,
  room,
  connected,
  socketId,
  onSend,
  onInvite
}: ChatPanelProps) {
  const styles = createStyles(theme, compactMessages);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<Message>>(null);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const wasNearBottomRef = useRef(true);

  useEffect(() => {
    setDraft('');
    setShowNewMessages(false);
  }, [room?.id]);

  const send = () => {
    const text = draft.trim();
    if (!text || !room) {
      return;
    }

    onSend(text);
    setDraft('');
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nearBottom = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
    wasNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setShowNewMessages(false);
    }
  };

  const handleContentSizeChange = () => {
    if (wasNearBottomRef.current) {
      listRef.current?.scrollToEnd({ animated: false });
    }
  };

  const scrollToBottom = () => {
    listRef.current?.scrollToEnd({ animated: true });
    setShowNewMessages(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.panel}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={24}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Active channel</Text>
          <Text style={styles.title}>{room ? room.name : 'No channel selected'}</Text>
        </View>
        <Pressable style={[styles.textButton, (!room || !connected) && styles.textButtonDisabled]} disabled={!room || !connected} onPress={onInvite}>
          <Text style={[styles.textButtonLabel, (!room || !connected) && styles.textButtonLabelDisabled]}>Invite</Text>
        </Pressable>
      </View>

      <View style={styles.messagesWrap}>
        <GridOverlay spacing={34} opacity={0.07} />
        <View style={styles.chatGlow1} />
        <View style={styles.chatGlow2} />
        <View style={styles.chatGlow3} />
        <FlatList
          ref={listRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          data={room?.messages || []}
          keyExtractor={(item) => item.id}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onContentSizeChange={handleContentSizeChange}
          scrollEnabled={false}
          nestedScrollEnabled
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {room ? 'No messages yet' : 'Select a signal to start chatting'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const identity = identityForMessage(room, item);
            const sent = item.senderId === socketId;

            return (
              <View style={[styles.message, sent ? styles.messageSent : styles.messageReceived]}>
                <View style={styles.authorRow}>
                  <View style={[styles.authorDot, { backgroundColor: sent ? '#052118' : (identity.color || theme.accent) }]} />
                  <Text style={[styles.author, sent ? styles.authorSent : { color: identity.color || theme.accent }]}>{identityLabel(identity)}</Text>
                </View>
                <Text style={[styles.text, sent ? { color: '#052118' } : { color: theme.text }]}>{item.text}</Text>
                <Text style={[styles.time, sent ? { color: 'rgba(5, 33, 24, 0.58)' } : { color: theme.muted }]}>{formatTime(item.sentAt)}</Text>
              </View>
            );
          }}
        />
        {showNewMessages ? (
          <Pressable style={styles.newMessagesButton} onPress={scrollToBottom}>
            <Text style={styles.newMessagesText}>New messages</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Send a message"
          placeholderTextColor={theme.muted}
          editable={Boolean(room && connected)}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
        />
        <Pressable style={[styles.sendButton, (!room || !connected || !draft.trim()) && styles.sendButtonDisabled]} disabled={!room || !connected || !draft.trim()} onPress={send}>
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme: AppTheme, compactMessages: boolean) {
  return StyleSheet.create({
    panel: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 18,
      backgroundColor: theme.surface,
      minHeight: 360,
      overflow: 'hidden',
      ...theme.shadow
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.line
    },
    eyebrow: {
      color: theme.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 6
    },
    title: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700'
    },
    textButton: {
      minHeight: 36,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      justifyContent: 'center'
    },
    textButtonDisabled: {
      opacity: 0.55
    },
    textButtonLabel: {
      color: theme.text,
      fontSize: 13
    },
    textButtonLabelDisabled: {
      opacity: 0.55
    },
    messagesWrap: {
      flex: 1,
      position: 'relative',
      backgroundColor: theme.surface,
      overflow: 'hidden',
    },
    chatGlow1: {
      position: 'absolute',
      top: -80,
      left: -40,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: 'rgba(86, 240, 192, 0.03)',
      pointerEvents: 'none',
    },
    chatGlow2: {
      position: 'absolute',
      top: -40,
      left: -20,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(86, 240, 192, 0.05)',
      pointerEvents: 'none',
    },
    chatGlow3: {
      position: 'absolute',
      top: -20,
      left: -10,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(86, 240, 192, 0.08)',
      pointerEvents: 'none',
    },
    messages: {
      flex: 1,
      maxHeight: 320
    },
    messagesContent: {
      gap: compactMessages ? 7 : 12,
      padding: compactMessages ? 12 : 18
    },
    emptyState: {
      minHeight: 80,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.line,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18
    },
    emptyText: {
      color: theme.muted,
      fontSize: 13,
      textAlign: 'center'
    },
    message: {
      borderRadius: 16,
      padding: compactMessages ? 9 : 12,
      gap: 4,
      maxWidth: '88%'
    },
    messageSent: {
      alignSelf: 'flex-end',
      backgroundColor: theme.accent
    },
    messageReceived: {
      alignSelf: 'flex-start',
      backgroundColor: theme.surface2
    },
    authorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginBottom: 5
    },
    authorDot: {
      width: 9,
      height: 9,
      borderRadius: 5
    },
    author: {
      fontWeight: '800',
      fontSize: compactMessages ? 11 : 12
    },
    authorSent: {
      color: '#052118'
    },
    text: {
      fontSize: compactMessages ? 14 : 15,
      lineHeight: compactMessages ? 18 : 21,
    },
    time: {
      fontSize: compactMessages ? 10 : 11,
      alignSelf: 'flex-end',
      marginTop: 7
    },
    newMessagesButton: {
      position: 'absolute',
      left: '50%',
      bottom: 8,
      transform: [{ translateX: -56 }],
      minHeight: 36,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: theme.accent,
      justifyContent: 'center',
      zIndex: 3
    },
    newMessagesText: {
      color: '#052118',
      fontWeight: '800',
      fontSize: 13
    },
    composer: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-end',
      padding: 14,
      borderTopWidth: 1,
      borderTopColor: theme.line
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface2,
      color: theme.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      lineHeight: 20
    },
    sendButton: {
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.accent,
      justifyContent: 'center'
    },
    sendButtonDisabled: {
      opacity: 0.55
    },
    sendButtonText: {
      color: '#052118',
      fontWeight: '800'
    }
  });
}
