import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json"; // even if temporary

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" }
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export const translations: Record<LangCode, Record<string, string>> = {
  en,
  es,
  fr
};
