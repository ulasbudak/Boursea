import { useCallback, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { DEFAULT_LOCALE, messages, resolveLocale, type Locale } from "@trendus/shared";
import { supabase } from "./supabase";
import { LocaleContext } from "./locale-context";

const LOCALE_STORAGE_KEY = "trendus_locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialLocale() {
      const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored) {
        if (isMounted) setLocaleState(resolveLocale(stored));
        return;
      }

      const deviceLocale = Localization.getLocales()[0]?.languageTag;
      if (isMounted) setLocaleState(resolveLocale(deviceLocale));
    }

    loadInitialLocale();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const metadataLocale = session?.user.user_metadata?.locale;
      if (typeof metadataLocale === "string") {
        const resolved = resolveLocale(metadataLocale);
        setLocaleState(resolved);
        AsyncStorage.setItem(LOCALE_STORAGE_KEY, resolved);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, next);
    supabase.auth.updateUser({ data: { locale: next } }).catch(() => {
      // Best-effort cross-device sync; local preference already applied above.
    });
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, messages: messages[locale], setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}
