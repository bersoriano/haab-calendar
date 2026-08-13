"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { LANGUAGE_COOKIE } from "@/lib/language/resolve";
import { translations, type Dict, type Lang } from "./translations";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Same cookie the proxy reads, so the next server render agrees on sight. */
function persistLanguage(lang: Lang) {
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

function updateLanguageInCurrentUrl(lang: Lang) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  window.history.replaceState(window.history.state, "", url);
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // The server already resolved the language into the cookie, so there is
  // nothing to restore after mount — only `<html lang>` to keep honest when
  // the visitor switches without a navigation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    persistLanguage(next);
    updateLanguageInCurrentUrl(next);
  }, []);

  const value: LanguageContextValue = {
    lang,
    setLang,
    t: translations[lang],
  };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
