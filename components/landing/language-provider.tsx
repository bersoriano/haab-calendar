"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { translations, type Dict, type Lang } from "./translations";

const STORAGE_KEY = "haab-lang";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: Dict;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  // Restore saved preference on mount. Done in an effect (not lazy init) so the
  // server-rendered default ("es") matches the first client render and avoids a
  // hydration mismatch; localStorage is only read after mount.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(saved);
    }
  }, []);

  // Keep <html lang> and storage in sync.
  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(
    () => setLangState((prev) => (prev === "es" ? "en" : "es")),
    [],
  );

  const value: LanguageContextValue = {
    lang,
    setLang,
    toggle,
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

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, toggle } = useLanguage();
  const nextLabel = lang === "es" ? "EN" : "ES";
  const ariaLabel =
    lang === "es" ? "Switch to English" : "Cambiar a español";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white/70 px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white ${className}`}
    >
      <span aria-hidden="true">🌐</span>
      <span>{nextLabel}</span>
    </button>
  );
}
