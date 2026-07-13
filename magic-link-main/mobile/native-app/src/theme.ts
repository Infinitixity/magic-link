import type { ThemeMode } from './types';

export interface AppTheme {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  danger: string;
  accentText: string;
  dangerText: string;
  shadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  glow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
}

const panelShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 24 },
  shadowOpacity: 0.35,
  shadowRadius: 80,
  elevation: 24
};

const blipGlow = {
  shadowColor: '#56f0c0',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.35,
  shadowRadius: 16
};

export const darkTheme: AppTheme = {
  bg: '#071013',
  surface: '#101c20',
  surface2: '#16262b',
  line: 'rgba(191, 255, 238, 0.14)',
  text: '#effff8',
  muted: '#8da7a0',
  accent: '#56f0c0',
  accent2: '#ffcc66',
  danger: '#ff6b6b',
  accentText: '#052118',
  dangerText: '#250606',
  shadow: panelShadow,
  glow: blipGlow
};

export const lightTheme: AppTheme = {
  bg: '#f4f7f4',
  surface: '#ffffff',
  surface2: '#eaf0ed',
  line: 'rgba(16, 52, 44, 0.14)',
  text: '#102019',
  muted: '#5e716b',
  accent: '#087f63',
  accent2: '#9a5d00',
  danger: '#ff6b6b',
  accentText: '#ffffff',
  dangerText: '#250606',
  shadow: { ...panelShadow, shadowOpacity: 0.14, elevation: 12 },
  glow: { ...blipGlow, shadowColor: '#087f63', shadowOpacity: 0.25 }
};

export function getTheme(mode: ThemeMode): AppTheme {
  return mode === 'light' ? lightTheme : darkTheme;
}
