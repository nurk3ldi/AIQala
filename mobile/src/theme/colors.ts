export const lightColors = {
  accent: '#8d1cdc',
  accentPale: '#ead5fa',
  accentSoft: '#f6ecfe',
  background: '#ffffff',
  border: '#e7e1ec',
  muted: '#6d6475',
  surface: '#ffffff',
  text: '#15131a',
  white: '#ffffff',
  black: '#000000',
};

export const darkColors = {
  accent: '#b65cff',
  accentPale: '#3a1558',
  accentSoft: '#21142f',
  background: '#000000',
  border: '#2d2436',
  muted: '#b8adc2',
  surface: '#15131a',
  text: '#ffffff',
  white: '#ffffff',
  black: '#000000',
};

export const colors = lightColors;

export type ThemeMode = 'light' | 'dark';
export type ThemeColors = typeof lightColors;
