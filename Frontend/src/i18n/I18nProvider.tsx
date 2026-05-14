//* eslint-disable react-hooks/preserve-manual-memoization */


"use client";

// src/i18n/I18nProvider.tsx

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LangCode, translations } from "./translations";

// Keeping the storage key constant so I don't accidentally break saved user preferences later.
const STORAGE_KEY = "medimind.lang";

// This is what I want the context to provide to the app.
type I18nContextValue = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
};

// I create the context with a safe "null" default, then guard it in a custom hook.
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Defaulting to English, then I'll load saved choice from localStorage.
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    // Reading from localStorage only on the client.
    const saved = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (saved && translations[saved]) {
      //* eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(saved);
    }
  }, []);

  const setLang = (next: LangCode) => {
    // Updating state + saving so the choice persists on refresh.
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const t = (key: string) => {
    // Returning the translated string if it exists.
    // Falling back to English if missing.
    // Falling back to the key itself if still missing (easy to spot missing translations).
    return translations[lang]?.[key] ?? translations.en?.[key] ?? key;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ lang, setLang, t }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  // Making sure I only use this hook inside I18nProvider.
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider />");
  return ctx;
}
