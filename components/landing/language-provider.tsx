"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CaretDown, GlobeSimple } from "@phosphor-icons/react";
import { translations, type Dict, type Lang } from "./translations";

export const LANDING_LANGUAGE_STORAGE_KEY = "haab-lang";

function updateLanguageInCurrentUrl(lang: Lang) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  window.history.replaceState(window.history.state, "", url);
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: Dict;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? "es");
  const [isReady, setIsReady] = useState(Boolean(initialLang));

  // A server-known language (auth return or configured provider) wins. Otherwise
  // restore the visitor preference after mount so browser APIs stay client-only.
  useEffect(() => {
    if (initialLang) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize a server-known language after a refreshed client boundary
      setLangState(initialLang);
      setIsReady(true);
      return;
    }

    const saved = window.localStorage.getItem(LANDING_LANGUAGE_STORAGE_KEY);
    if (saved === "es" || saved === "en") {
      setLangState(saved);
    }
    setIsReady(true);
  }, [initialLang]);

  // Keep <html lang> and storage in sync.
  useEffect(() => {
    if (!isReady) return;
    document.documentElement.lang = lang;
    window.localStorage.setItem(LANDING_LANGUAGE_STORAGE_KEY, lang);
  }, [isReady, lang]);

  const setLang = useCallback((next: Lang) => {
    setIsReady(true);
    setLangState(next);
    updateLanguageInCurrentUrl(next);
  }, []);
  const toggle = useCallback(
    () => {
      setIsReady(true);
      setLangState((prev) => {
        const next = prev === "es" ? "en" : "es";
        updateLanguageInCurrentUrl(next);
        return next;
      });
    },
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
  const { lang, setLang } = useLanguage();
  const ariaLabel = lang === "es" ? "Seleccionar idioma" : "Select language";

  return (
    <label
      className={`group relative inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-white/65 focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--accent-soft)] ${className}`}
    >
      <span className="sr-only">{ariaLabel}</span>
      <GlobeSimple aria-hidden="true" className="h-[18px] w-[18px] text-[var(--muted)]" />
      <select
        aria-label={ariaLabel}
        value={lang}
        onChange={(event) => setLang(event.target.value as Lang)}
        className="cursor-pointer appearance-none bg-transparent pr-4 text-sm font-semibold outline-none"
      >
        <option value="en">EN</option>
        <option value="es">ES</option>
      </select>
      <CaretDown
        aria-hidden="true"
        weight="bold"
        className="pointer-events-none absolute right-2 h-3 w-3 text-[var(--muted)] transition group-hover:text-[var(--ink)]"
      />
    </label>
  );
}
