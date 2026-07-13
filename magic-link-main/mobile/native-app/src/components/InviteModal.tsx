import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '../theme';
import type { RoomInvite } from '../types';

interface InviteModalProps {
  visible: boolean;
  theme: AppTheme;
  invite: RoomInvite | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function InviteModal({ visible, theme, invite, onAccept, onDecline }: InviteModalProps) {
  const styles = createStyles(theme);

  return (
    <Modal visible={visible && Boolean(invite)} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Incoming invite</Text>
          <Text style={styles.title}>{invite?.isPrivate ? 'Private invite' : 'Chat invite'}</Text>
          <Text style={styles.body}>
            {invite
              ? `${invite.requesterName} wants to connect${
                  invite.roomId ? ' in this channel' : ' on a new channel'
                }.`
              : ''}
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton} onPress={onDecline}>
              <Text style={styles.secondaryButtonText}>Decline</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onAccept}>
              <Text style={styles.primaryButtonText}>Accept</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
      maxWidth: 420,
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
    body: {
      color: theme.text,
      lineHeight: 22
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 8
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
