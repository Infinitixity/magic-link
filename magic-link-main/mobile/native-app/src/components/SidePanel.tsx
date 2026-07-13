import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppTheme } from '../theme';
import type { Room } from '../types';
import { identityLabel } from '../utils/identity';

interface SidePanelProps {
  theme: AppTheme;
  rooms: Room[];
  currentRoom?: Room;
  currentRoomId: string | null;
  socketId: string | null;
  connected: boolean;
  onRefresh: () => void;
  onOpenRoom: (roomId: string) => void;
  onKick: (roomId: string, targetId: string) => void;
  onBan: (roomId: string, targetId: string) => void;
}

export function SidePanel({
  theme,
  rooms,
  currentRoom,
  currentRoomId,
  socketId,
  connected,
  onRefresh,
  onOpenRoom,
  onKick,
  onBan
}: SidePanelProps) {
  const styles = createStyles(theme);

  return (
    <View style={styles.panel}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Channels</Text>
          <Pressable style={[styles.textButton, !connected && styles.textButtonDisabled]} disabled={!connected} onPress={onRefresh}>
            <Text style={[styles.textButtonLabel, !connected && styles.textButtonLabelDisabled]}>Refresh</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {rooms.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No channels yet</Text>
            </View>
          ) : (
            rooms.map((room) => (
              <Pressable
                key={room.id}
                style={[styles.roomItem, room.id === currentRoomId && styles.roomItemActive]}
                onPress={() => onOpenRoom(room.id)}
              >
                <Text style={styles.roomTitle}>{room.name}</Text>
                <Text style={styles.roomMeta}>
                  {room.members.length} member{room.members.length === 1 ? '' : 's'} ·{' '}
                  {room.messages.length} message{room.messages.length === 1 ? '' : 's'}
                  {room.isPrivate ? ' · private' : ''}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Members</Text>
          <Text style={styles.count}>{currentRoom?.members.length || 0}</Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {!currentRoom ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Open a channel</Text>
            </View>
          ) : (
            currentRoom.members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <View style={styles.memberNameRow}>
                  <View style={[styles.memberDot, { backgroundColor: member.color || theme.accent }]} />
                  <Text style={styles.memberName}>{identityLabel(member)}</Text>
                </View>
                {currentRoom.ownerId === socketId && member.id !== socketId ? (
                  <View style={styles.memberActions}>
                    <Pressable style={styles.smallButton} onPress={() => onKick(currentRoom.id, member.id)}>
                      <Text style={styles.smallButtonText}>Kick</Text>
                    </Pressable>
                    <Pressable style={styles.smallButton} onPress={() => onBan(currentRoom.id, member.id)}>
                      <Text style={styles.smallButtonText}>Ban</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    panel: {
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 18,
      backgroundColor: theme.surface,
      padding: 16,
      gap: 14,
      minHeight: 280,
      ...theme.shadow
    },
    section: {
      gap: 12,
      flex: 1
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700'
    },
    count: {
      color: theme.muted,
      fontSize: 13
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
    list: {
      maxHeight: 260
    },
    listContent: {
      gap: 8
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
    roomItem: {
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: theme.surface2,
      gap: 5
    },
    roomItemActive: {
      borderColor: theme.accent
    },
    roomTitle: {
      color: theme.text,
      fontWeight: '700'
    },
    roomMeta: {
      color: theme.muted,
      fontSize: 12
    },
    memberRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: 12,
      backgroundColor: theme.surface2
    },
    memberNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1
    },
    memberDot: {
      width: 10,
      height: 10,
      borderRadius: 5
    },
    memberName: {
      color: theme.text,
      fontWeight: '700',
      flex: 1
    },
    memberActions: {
      flexDirection: 'row',
      gap: 6
    },
    smallButton: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface
    },
    smallButtonText: {
      color: theme.text,
      fontSize: 11
    }
  });
}
