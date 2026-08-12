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
  toggle: () => void;
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

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next = prev === "es" ? "en" : "es";
      persistLanguage(next);
      updateLanguageInCurrentUrl(next);
      return next;
    });
  }, []);

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
