import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Adding a language = drop one JSON file in src/locales (same keys as en.json, plus "meta.name"). Nothing else to edit.
const files = import.meta.glob<{ default: Record<string, any> }>("./locales/*.json", { eager: true });
const resources = Object.fromEntries(
  Object.entries(files).map(([path, m]) => [path.match(/([\w-]+)\.json$/)![1], { translation: m.default }]),
);
export const LANGUAGES: Record<string, string> = Object.fromEntries(
  Object.entries(resources).map(([code, r]) => [code, r.translation.meta.name as string]),
);

function initial(): string {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("lang");
  } catch {
    /* storage can be blocked */
  }
  const guess = saved ?? navigator.language.split("-")[0];
  return guess in LANGUAGES ? guess : "en";
}

i18n.use(initReactI18next).init({
  resources,
  lng: initial(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});
document.documentElement.lang = i18n.language;

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
