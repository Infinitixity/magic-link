import { MAX_NAME_LENGTH } from '../config';
import type { Message, Room, User } from '../types';

export function cleanName(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function identityLabel(user?: Pick<User, 'username' | 'code'> | null): string {
  if (!user?.username) {
    return 'Unknown';
  }

  return `${user.username}${user.code ? ` #${user.code}` : ''}`;
}

export function identityForMessage(room: Room | undefined, message: Message) {
  const member = room?.members.find((item) => item.id === message.senderId);

  return {
    username: member?.username || message.senderName,
    code: member?.code || message.senderCode || '',
    color: member?.color || message.senderColor || '#56f0c0'
  };
}

export function formatChannel(channel: number): string {
  return String(channel).padStart(3, '0');
}

export function formatTime(value?: number): string {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function normalizeServerUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/+$/, '');
  }

  return `https://${trimmed.replace(/\/+$/, '')}`;
}
