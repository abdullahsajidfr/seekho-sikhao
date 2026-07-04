import React, { createContext, useContext, useState, useCallback } from 'react';
import { STRINGS } from '../translations';
import type { Language } from '../types/session';

interface LanguageContextValue {
  language: Language;
  t: (key: keyof typeof STRINGS['en']) => string;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>('en');

  const setLanguage = useCallback((lang: Language) => {
    setLangState(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'ur' ? 'rtl' : 'ltr';
  }, []);

  const t = useCallback(
    (key: keyof typeof STRINGS['en']) => STRINGS[language][key] ?? key,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
