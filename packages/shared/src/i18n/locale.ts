export const SUPPORTED_LOCALES = ["tr", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_TAGS: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
};

function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function primaryLanguageSubtag(tag: string): string {
  return tag.trim().toLowerCase().split(/[-_]/)[0];
}

/** Resolves a single BCP-47-ish language tag (e.g. "tr-TR") to a supported Locale. */
export function resolveLocale(tag: string | null | undefined): Locale {
  if (!tag) {
    return DEFAULT_LOCALE;
  }
  const primary = primaryLanguageSubtag(tag);
  return isSupportedLocale(primary) ? primary : DEFAULT_LOCALE;
}

/** Resolves the first supported locale out of an HTTP `Accept-Language` header value. */
export function resolveLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) {
    return DEFAULT_LOCALE;
  }
  const tags = header.split(",").map((part) => part.split(";")[0]);
  for (const tag of tags) {
    const primary = primaryLanguageSubtag(tag);
    if (isSupportedLocale(primary)) {
      return primary;
    }
  }
  return DEFAULT_LOCALE;
}
