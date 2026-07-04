import React, { createContext, useContext, useState, useCallback } from 'react';
import { STRINGS, type StringKey } from '../translations';
import type { Language } from '../types/session';

interface LanguageContextValue {
  language: Language;
  t: (key: StringKey) => string;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>('en');

  // In React Native there is no document element / dir attribute. RTL layout is
  // handled per-view via textAlign; we only track the active language here.
  const setLanguage = useCallback((lang: Language) => setLangState(lang), []);

  const t = useCallback(
    (key: StringKey) => STRINGS[language][key] ?? key,
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
