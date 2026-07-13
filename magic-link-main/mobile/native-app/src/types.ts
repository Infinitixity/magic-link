export type ThemeMode = 'dark' | 'light';

export type ConnectionState = 'connecting' | 'online' | 'reconnecting' | 'offline';

export type AppMode = 'radar' | 'radio';

export interface User {
  id: string;
  username: string;
  code: string;
  color: string;
  x: number;
  y: number;
  status?: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderCode?: string;
  senderColor?: string;
  text: string;
  sentAt: number;
}

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  isPrivate: boolean;
  members: Array<Pick<User, 'id' | 'username' | 'code' | 'color'>>;
  messages: Message[];
}

export interface RoomInvite {
  requesterId: string;
  requesterName: string;
  roomId: string | null;
  isPrivate: boolean;
}

export interface RadioChannelInfo {
  channel: number;
  listeners: number;
}

export interface Preferences {
  theme: ThemeMode;
  compactMessages: boolean;
  reduceMotion: boolean;
}

export interface RadioState {
  enabled: boolean;
  channel: number;
  activeChannels: RadioChannelInfo[];
  transmitting: boolean;
  micStatus: 'off' | 'transmitting' | 'receiving';
  micLabel: string;
}
