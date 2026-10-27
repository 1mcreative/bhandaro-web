import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";

// Adding a language = one JSON file + one line here.
export const LANGUAGES = { en: "English", hi: "हिन्दी" } as const;

function initial(): string {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("lang");
  } catch {
    /* storage can be blocked */
  }
  const guess = saved ?? navigator.language.slice(0, 2);
  return guess in LANGUAGES ? guess : "en";
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: initial(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(l: string) {
  i18n.changeLanguage(l);
  document.documentElement.lang = l;
  try {
    localStorage.setItem("lang", l);
  } catch {
    /* ignore */
  }
}

export default i18n;
