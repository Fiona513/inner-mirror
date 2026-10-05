"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALE_STORAGE_KEY, isLocale, messages } from "./messages";
import type { Locale, MessageKey, Messages } from "./messages";

const DOCUMENT_LANG: Record<Locale, string> = {
  "zh-CN": "zh-CN",
  en: "en",
};

interface LocaleContextValue {
  /** Currently active locale. */
  locale: Locale;
  /** Persists the choice to `inner-mirror:locale` and applies it immediately. */
  setLocale: (locale: Locale) => void;
  /** Translate a checked message key for the active locale. */
  t: (key: MessageKey) => string;
  /** Message catalog of the active locale. */
  messages: Messages;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale | null {
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

function defaultLocale(): Locale {
  return "zh-CN";
}

function resolveMessage(catalog: Messages, key: string): string | undefined {
  let node: unknown = catalog;
  for (const segment of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[segment];
    if (node === undefined) return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Deterministic initial value so the first client render matches SSR.
  // A stored choice wins; otherwise the public experience starts in Chinese.
  const [locale, setLocale] = useState<Locale>("zh-CN");

  useEffect(() => {
    const resolved = readStoredLocale() ?? defaultLocale();
    setLocale(resolved);
    document.documentElement.lang = DOCUMENT_LANG[resolved];
  }, []);

  useEffect(() => {
    document.documentElement.lang = DOCUMENT_LANG[locale];
  }, [locale]);

  const changeLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // Storage unavailable — the choice still applies for this session.
    }
    setLocale(next);
  }, []);

  const t = useCallback(
    (key: MessageKey): string =>
      resolveMessage(messages[locale], key) ??
      resolveMessage(messages["zh-CN"], key) ??
      key,
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale: changeLocale, t, messages: messages[locale] }),
    [locale, changeLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within a LocaleProvider");
  return value;
}

/** Convenience hook exposing only the translate function. */
export function useT(): (key: MessageKey) => string {
  return useLocale().t;
}

/** Keep short interface copy in sync with the selected language. */
export function useCopy(): (chinese: string, english: string) => string {
  const { locale } = useLocale();
  return useCallback((chinese: string, english: string) => locale === "zh-CN" ? chinese : english, [locale]);
}

export { LOCALE_STORAGE_KEY };
export type { Locale, MessageKey, Messages };
