export const DEFAULT_SERVER_URL = 'https://magic-link-redirector.pages.dev';
export const LOCAL_PI_URL = 'http://10.42.0.1';
export const RADAR_REFRESH_MS = 2500;
export const MAX_NAME_LENGTH = 24;
export const MAX_MESSAGE_LENGTH = 500;

export const STORAGE_KEYS = {
  name: 'magic-link-name',
  theme: 'magic-link-theme',
  compact: 'magic-link-compact',
  reduceMotion: 'magic-link-reduce-motion',
  serverUrl: 'magic-link-server-url'
} as const;
