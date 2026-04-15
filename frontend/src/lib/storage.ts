import type { AuthSession } from '../types/api';

const AUTH_STORAGE_KEY = 'aiqala.auth.session';
const THEME_STORAGE_KEY = 'aiqala.theme.mode';
const LANGUAGE_STORAGE_KEY = 'aiqala.language';

export const authStorage = {
  load(): AuthSession | null {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  },
  save(session: AuthSession) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  },
  clear() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  },
};

export const themeStorage = {
  load(): 'dark' | 'light' | null {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'dark' || raw === 'light' ? raw : null;
  },
  save(theme: 'dark' | 'light') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  },
};

export const languageStorage = {
  load(): 'kk' | 'ru' | 'en' | null {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return raw === 'kk' || raw === 'ru' || raw === 'en' ? raw : null;
  },
  save(language: 'kk' | 'ru' | 'en') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  },
};
