import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { RADAR_REFRESH_MS } from '../config';
import { RadioWebRTC } from '../lib/radioWebRTC';
import type {
  ConnectionState,
  Message,
  RadioChannelInfo,
  RadioState,
  Room,
  RoomInvite,
  User
} from '../types';
import { cleanName } from '../utils/identity';
import { loadSavedName, saveName } from '../utils/storage';

const radioNativeControls =
  Platform.OS === 'android' ? NativeModules.VolumeButtonControls : null;
const radioNativeEvents = radioNativeControls
  ? new NativeEventEmitter(radioNativeControls)
  : null;

async function resolveServerUrl(url: string): Promise<string> {
  try {
    const base = url.replace(/\/+$/, '');
    const txtUrl = `${base}/current-url.txt`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const txtRes = await fetch(txtUrl, { signal: controller.signal });
    clearTimeout(id);
    if (txtRes.ok) {
      const text = await txtRes.text();
      const resolved = text.trim();
      if (resolved) return resolved;
    }
  } catch {
  }

  return url;
}

interface UseMagicLinkSocketOptions {
  serverUrl: string;
  enabled: boolean;
  onToast: (message: string) => void;
}

export function useMagicLinkSocket({
  serverUrl,
  enabled,
  onToast
}: UseMagicLinkSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onToastRef = useRef(onToast);
  const hasJoinedOnceRef = useRef(false);
  const radioWebRTCRef = useRef<RadioWebRTC | null>(null);
  const inviteTargetRoomIdRef = useRef<string | null>(null);
  const draftsRef = useRef(new Map<string, string>());

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map());
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState<RoomInvite | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [radio, setRadio] = useState<RadioState>({
    enabled: false,
    channel: 1,
    activeChannels: [],
    transmitting: false,
    micStatus: 'off',
    micLabel: 'MIC OFF',
    volume: 80,
    muted: false
  });
  const radioRef = useRef(radio);
  radioRef.current = radio;

  onToastRef.current = onToast;

  const currentRoom = currentRoomId ? rooms.get(currentRoomId) : undefined;

  const joinWithName = useCallback(async (socket: Socket, username?: string) => {
    const resolved = cleanName(username || (await loadSavedName()));
    if (!resolved) {
      setNeedsJoin(true);
      return false;
    }

    socket.emit('user:join', { username: resolved });
    return true;
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const [effectiveUrl, setEffectiveUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!serverUrl) {
      setEffectiveUrl(null);
      return;
    }

    let cancelled = false;
    resolveServerUrl(serverUrl).then((resolved) => {
      if (!cancelled) setEffectiveUrl(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [serverUrl]);

  useEffect(() => {
    if (!enabled || !effectiveUrl) {
      disconnectSocket();
      setConnectionState(effectiveUrl === null ? 'connecting' : 'offline');
      return;
    }

    disconnectSocket();
    setConnectionState('connecting');
    setMe(null);
    setUsers([]);
    setRooms(new Map());
    setCurrentRoomId(null);
    setPendingInvite(null);

    const socket = io(effectiveUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      timeout: 15000
    });

    socketRef.current = socket;

    socket.on('connect', async () => {
      setConnectionState('online');
      const joined = await joinWithName(socket);
      if (joined && hasJoinedOnceRef.current) {
        onToastRef.current('Back online');
      }
      if (radioRef.current.enabled) {
        if (!radioWebRTCRef.current) {
          try {
            const webrtc = new RadioWebRTC(
              (targetId, signal) => {
                socketRef.current?.emit('radio:signal', { targetId, signal });
              },
              (msg, err) => {
                console.warn('[RadioWebRTC]', msg, err);
                socketRef.current?.emit('app:error', `[RadioWebRTC] ${msg}`);
              }
            );
            await webrtc.enable();
            radioWebRTCRef.current = webrtc;
          } catch {
            radioWebRTCRef.current = null;
          }
        }
        socket.emit('radio:join', { channel: radioRef.current.channel });
      }
    });

    socket.on('connect_error', () => {
      setConnectionState('reconnecting');
    });

    socket.on('disconnect', (reason) => {
      setConnectionState(reason === 'io client disconnect' ? 'offline' : 'reconnecting');
      setRadio((prev) => ({
        ...prev,
        transmitting: false,
        micStatus: 'off',
        micLabel: 'MIC OFF'
      }));
      radioWebRTCRef.current?.disable();
      radioWebRTCRef.current = null;
      onToastRef.current('Connection lost. Reconnecting...');
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionState('offline');
      onToastRef.current('Server is still offline.');
    });

    socket.on('user:ready', (user: User) => {
      setMe(user);
      setNeedsJoin(false);
      hasJoinedOnceRef.current = true;
      socket.emit('radar:refresh');
    });

    socket.on('radar:update', (nextUsers: User[]) => {
      setUsers(Array.isArray(nextUsers) ? nextUsers : []);
    });

    socket.on('room:invite', (invite: RoomInvite) => {
      setPendingInvite(invite);
    });

    socket.on('room:update', (room: Room) => {
      setRooms((prev) => {
        const next = new Map(prev);
        next.set(room.id, room);
        return next;
      });
    });

    socket.on('room:opened', (room: Room) => {
      setRooms((prev) => {
        const next = new Map(prev);
        next.set(room.id, room);
        return next;
      });
      setCurrentRoomId(room.id);
    });

    socket.on('message:new', (message: Message) => {
      setRooms((prev) => {
        const room = prev.get(message.roomId);
        if (!room) {
          return prev;
        }

        const next = new Map(prev);
        next.set(message.roomId, {
          ...room,
          messages: [...room.messages, message]
        });
        return next;
      });
    });

    socket.on('room:removed', ({ roomId, type }: { roomId: string; type: string }) => {
      setRooms((prev) => {
        const next = new Map(prev);
        next.delete(roomId);
        return next;
      });
      setCurrentRoomId((current) => (current === roomId ? null : current));
      draftsRef.current.delete(roomId);
      onToastRef.current(
        type === 'ban' ? 'You were banned from the channel' : 'You were removed from the channel'
      );
    });

    socket.on('app:error', (message: string) => {
      onToastRef.current(message);
    });

    socket.on('radio:channels', (channels: RadioChannelInfo[]) => {
      setRadio((prev) => ({
        ...prev,
        activeChannels: Array.isArray(channels) ? channels : []
      }));
    });

    socket.on('radio:joined', async ({ channel, peers }: { channel: number; peers?: Array<{ id: string }> }) => {
      setRadio((prev) => ({
        ...prev,
        channel
      }));
      const webrtc = radioWebRTCRef.current;
      if (webrtc && peers?.length) {
        for (const peer of peers) {
          await webrtc.handlePeerJoined(peer.id);
        }
      }
    });

    socket.on('radio:ptt', ({ username, code, active }: { username: string; code?: string; active: boolean }) => {
      setRadio((prev) => {
        if (prev.transmitting) {
          return prev;
        }

        return {
          ...prev,
          micStatus: active ? 'receiving' : 'off',
          micLabel: active ? `RX ${username}${code ? ` #${code}` : ''}` : 'MIC OFF'
        };
      });
    });

    socket.on('radio:admin-off', ({ reason }: { channel?: number; reason?: string }) => {
      radioWebRTCRef.current?.disable();
      radioWebRTCRef.current = null;
      setRadio((prev) => ({
        ...prev,
        enabled: false,
        transmitting: false,
        muted: false,
        micStatus: 'off',
        micLabel: 'MIC OFF'
      }));
      onToastRef.current(
        reason === 'admin-ban'
          ? 'You were banned from this radio channel.'
          : 'Your radio was turned off by admin.'
      );
    });

    socket.on('radio:admin-muted', ({ muted }: { channel?: number; muted: boolean }) => {
      const isMuted = Boolean(muted);
      if (isMuted) {
        radioWebRTCRef.current?.stopTransmitting();
        socketRef.current?.emit('radio:ptt', { active: false });
      }

      setRadio((prev) => ({
        ...prev,
        muted: isMuted,
        transmitting: isMuted ? false : prev.transmitting,
        micStatus: isMuted ? 'off' : prev.micStatus,
        micLabel: isMuted ? 'MIC OFF' : prev.micLabel
      }));
      onToastRef.current(isMuted ? 'You were muted in this radio channel.' : 'You were unmuted in this radio channel.');
    });

    socket.on('radio:peer-joined', () => {
    });

    socket.on('radio:peer-left', ({ peerId }: { peerId: string }) => {
      radioWebRTCRef.current?.handlePeerLeft(peerId);
    });

    socket.on('radio:signal', ({ peerId, signal }: { peerId: string; signal: unknown }) => {
      radioWebRTCRef.current?.handleSignal(peerId, signal);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [disconnectSocket, enabled, joinWithName, effectiveUrl]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !me) {
      return;
    }

    const timer = setInterval(() => {
      socket.emit('radar:refresh');
    }, RADAR_REFRESH_MS);

    return () => clearInterval(timer);
  }, [me, serverUrl]);

  const roomList = useMemo(() => Array.from(rooms.values()), [rooms]);

  const applyMediaVolume = useCallback((volume: number) => {
    const nextVolume = Math.max(0, Math.min(100, Math.round(volume)));
    radioNativeControls?.setMediaVolume?.(nextVolume);
    return nextVolume;
  }, []);

  useEffect(() => {
    if (!radioNativeEvents) {
      return;
    }

    radioNativeControls?.getMediaVolume?.();

    const subscription = radioNativeEvents.addListener(
      'MagicLinkMediaVolumeChanged',
      (event: { volume?: number }) => {
        if (typeof event.volume !== 'number') {
          return;
        }

        const nextVolume = Math.max(0, Math.min(100, Math.round(event.volume)));
        setRadio((prev) => (prev.volume === nextVolume ? prev : { ...prev, volume: nextVolume }));
      }
    );

    return () => subscription.remove();
  }, []);

  const onlineUsers = useMemo(
    () => users.filter((user) => user.id !== me?.id),
    [me?.id, users]
  );

  const actions = {
    join: async (username: string) => {
      const cleaned = cleanName(username);
      if (!cleaned) {
        return;
      }

      await saveName(cleaned);
      setNeedsJoin(false);
      socketRef.current?.emit('user:join', { username: cleaned });
    },

    refreshRadar: () => {
      socketRef.current?.emit('radar:refresh');
    },

    openRoom: (roomId: string) => {
      setCurrentRoomId(roomId);
    },

    requestRoom: (targetId: string, isPrivate: boolean) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        onToastRef.current('Reconnecting. Try again in a moment.');
        return;
      }

      const room = currentRoomId ? rooms.get(currentRoomId) : undefined;
      socket.emit('room:request', {
        targetId,
        roomId: inviteTargetRoomIdRef.current || room?.id || null,
        isPrivate
      });
      inviteTargetRoomIdRef.current = null;
      onToastRef.current('Invite sent');
    },

    acceptInvite: () => {
      if (!pendingInvite) {
        return;
      }

      if (!socketRef.current?.connected) {
        onToastRef.current('Reconnecting. Try again in a moment.');
        return;
      }

      socketRef.current.emit('room:accept', pendingInvite);
      setPendingInvite(null);
    },

    declineInvite: () => {
      setPendingInvite(null);
    },

    sendMessage: (text: string) => {
      const room = currentRoomId ? rooms.get(currentRoomId) : undefined;
      const cleaned = text.trim();
      if (!room || !cleaned) {
        return;
      }

      if (!socketRef.current?.connected) {
        onToastRef.current('Message not sent. Reconnecting...');
        return;
      }

      socketRef.current.emit('message:send', {
        roomId: room.id,
        text: cleaned
      });
      draftsRef.current.delete(room.id);
    },

    removeMember: (roomId: string, targetId: string, ban: boolean) => {
      if (!socketRef.current?.connected) {
        onToastRef.current('Reconnecting. Try again in a moment.');
        return;
      }

      socketRef.current.emit('room:remove-member', {
        roomId,
        targetId,
        ban
      });
    },

    prepareInviteFromCurrentRoom: () => {
      if (!currentRoomId) {
        return;
      }

      inviteTargetRoomIdRef.current = currentRoomId;
      onToastRef.current('Pick a radar signal to invite');
    },

    enableRadio: async () => {
      if (!socketRef.current?.connected || !me) {
        onToastRef.current('Connect to the server before turning on the radio.');
        return;
      }

      radioWebRTCRef.current?.disable();

      try {
        const webrtc = new RadioWebRTC(
          (targetId, signal) => {
            socketRef.current?.emit('radio:signal', { targetId, signal });
          },
          (msg, err) => {
            console.warn('[RadioWebRTC]', msg, err);
            socketRef.current?.emit('app:error', `[RadioWebRTC] ${msg}`);
          }
        );
        await webrtc.enable();
        applyMediaVolume(radioRef.current.volume);
        radioWebRTCRef.current = webrtc;
      } catch {
        radioWebRTCRef.current = null;
        onToastRef.current('Microphone access denied. Radio will work without voice.');
      }

      setRadio((prev) => ({ ...prev, enabled: true, muted: false }));
      socketRef.current.emit('radio:join', { channel: radio.channel });
      onToastRef.current('Radio enabled.');
    },

    disableRadio: () => {
      socketRef.current?.emit('radio:leave');
      radioWebRTCRef.current?.disable();
      radioWebRTCRef.current = null;
      setRadio((prev) => ({
        ...prev,
        enabled: false,
        transmitting: false,
        muted: false,
        micStatus: 'off',
        micLabel: 'MIC OFF'
      }));
    },

    selectRadioChannel: (channel: number) => {
      const nextChannel = Math.max(1, Math.min(100, Number(channel) || 1));
      setRadio((prev) => ({
        ...prev,
        channel: nextChannel,
        transmitting: false,
        muted: false,
        micStatus: 'off',
        micLabel: 'MIC OFF'
      }));

      if (radio.enabled) {
        radioWebRTCRef.current?.resetPeers();
        socketRef.current?.emit('radio:join', { channel: nextChannel });
      }
    },

    setVolume: (volume: number) => {
      const nextVolume = applyMediaVolume(volume);
      setRadio((prev) => ({ ...prev, volume: nextVolume }));
    },

    startTransmitting: () => {
      if (!radio.enabled || radio.muted || !socketRef.current?.connected) {
        if (radio.muted) {
          onToastRef.current('You are muted in this radio channel.');
        }
        return;
      }

      radioWebRTCRef.current?.startTransmitting();

      setRadio((prev) => ({
        ...prev,
        transmitting: true,
        micStatus: 'transmitting',
        micLabel: 'TRANSMITTING'
      }));
      socketRef.current.emit('radio:ptt', { active: true });
    },

    stopTransmitting: () => {
      if (!radio.transmitting) {
        return;
      }

      radioWebRTCRef.current?.stopTransmitting();

      setRadio((prev) => ({
        ...prev,
        transmitting: false,
        micStatus: 'off',
        micLabel: 'MIC OFF'
      }));
      socketRef.current?.emit('radio:ptt', { active: false });
    },

    reconnect: () => {
      socketRef.current?.connect();
    }
  };

  return {
    connectionState,
    me,
    onlineUsers,
    roomList,
    currentRoom,
    currentRoomId,
    pendingInvite,
    needsJoin,
    radio,
    socketId: socketRef.current?.id || null,
    actions
  };
}
