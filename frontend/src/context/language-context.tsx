import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { setI18nLanguage, translate, type Language } from '../lib/i18n';
import { languageStorage } from '../lib/storage';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => languageStorage.load() ?? 'kk');

  useEffect(() => {
    setI18nLanguage(language);
    document.documentElement.lang = language;
    languageStorage.save(language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(key, params, language),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }

  return context;
};
