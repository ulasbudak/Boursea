import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, messages, type Locale, type Messages } from "@trendus/shared";

export type LocaleContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
};

export const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  messages: messages[DEFAULT_LOCALE],
  setLocale: () => {},
});

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
