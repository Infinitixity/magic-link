import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SERVER_URL, STORAGE_KEYS } from '../config';
import type { Preferences } from '../types';
import { normalizeServerUrl } from './identity';

export async function loadSavedName(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.name)) || '';
}

export async function saveName(name: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.name, name);
}

export async function loadPreferences(): Promise<Preferences> {
  const [theme, compact, reduceMotion] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.theme),
    AsyncStorage.getItem(STORAGE_KEYS.compact),
    AsyncStorage.getItem(STORAGE_KEYS.reduceMotion)
  ]);

  return {
    theme: theme === 'light' ? 'light' : 'dark',
    compactMessages: compact === 'true',
    reduceMotion: reduceMotion === 'true'
  };
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.theme, preferences.theme),
    AsyncStorage.setItem(STORAGE_KEYS.compact, preferences.compactMessages ? 'true' : 'false'),
    AsyncStorage.setItem(
      STORAGE_KEYS.reduceMotion,
      preferences.reduceMotion ? 'true' : 'false'
    )
  ]);
}

export async function clearLocalData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}

export async function loadServerUrl(): Promise<string> {
  const saved = await AsyncStorage.getItem(STORAGE_KEYS.serverUrl);
  return normalizeServerUrl(saved || DEFAULT_SERVER_URL);
}

export async function saveServerUrl(url: string): Promise<string> {
  const normalized = normalizeServerUrl(url);
  await AsyncStorage.setItem(STORAGE_KEYS.serverUrl, normalized);
  return normalized;
}
