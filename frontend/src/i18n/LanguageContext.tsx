import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { SUPPORTED_LANGUAGES, type SupportedLanguage, type TranslationSchema, type LanguageOption } from "./types";
import { en } from "./translations/en";
import { hi } from "./translations/hi";
import { mr } from "./translations/mr";
import { te } from "./translations/te";
import { ta } from "./translations/ta";
import { kn } from "./translations/kn";

const TRANSLATIONS: Record<string, TranslationSchema> = {
  en,
  hi,
  mr,
  te,
  ta,
  kn,
  // Fallbacks for bn and gu map to hi
  bn: hi,
  gu: hi,
};

const STORAGE_KEY = "metriscan_preferred_language";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  currentOption: LanguageOption;
  availableLanguages: LanguageOption[];
  t: (path: string, defaultValue?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return "en";
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore
    }
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const currentOption = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const dict = useMemo(() => {
    return TRANSLATIONS[language] || TRANSLATIONS.en;
  }, [language]);

  // Nested key resolver helper (e.g., t("product.productName"))
  const t = (path: string, defaultValue?: string): string => {
    const parts = path.split(".");
    let current: any = dict;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        // Fallback to English
        let fallback: any = TRANSLATIONS.en;
        for (const fbPart of parts) {
          if (fallback && typeof fallback === "object" && fbPart in fallback) {
            fallback = fallback[fbPart];
          } else {
            return defaultValue || path;
          }
        }
        return typeof fallback === "string" ? fallback : defaultValue || path;
      }
    }
    return typeof current === "string" ? current : defaultValue || path;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        currentOption,
        availableLanguages: SUPPORTED_LANGUAGES,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
