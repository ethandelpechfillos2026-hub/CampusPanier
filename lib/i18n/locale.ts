// Les 3 langues demandées (retour utilisateur, 9 août 2026) — le français
// reste la langue de référence : c'est elle qui définit la FORME du
// dictionnaire (voir dictionaries/fr.ts + dictionary-type.ts), toute
// nouvelle clé doit d'abord y être ajoutée.
export type Locale = "fr" | "en" | "es";

export const LOCALES: Locale[] = ["fr", "en", "es"];

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
};

export const DEFAULT_LOCALE: Locale = "fr";

// Code de locale Intl (toLocaleDateString, toLocaleString...) associé à
// chaque langue de l'app — utilisé partout où on formate une date ou un
// nombre pour qu'il suive la langue choisie plutôt que d'être figé en
// français (voir HistoryPanel.tsx, PrintableListView.tsx...).
export const INTL_LOCALE: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
};
