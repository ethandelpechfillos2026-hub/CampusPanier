"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { updateDisplaySettings } from "@/lib/authProfile";
import { auth } from "@/lib/firebase";
import en from "@/lib/i18n/dictionaries/en";
import es from "@/lib/i18n/dictionaries/es";
import fr from "@/lib/i18n/dictionaries/fr";
import { DEFAULT_LOCALE, Locale } from "@/lib/i18n/locale";
import { interpolate } from "@/lib/i18n/translate";

const DICTIONARIES: Record<Locale, Partial<Record<string, string>>> = {
  fr,
  en,
  es,
};

const LANGUAGE_STORAGE_KEY = "campus-panier-language";

function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en" || value === "es";
}

interface LanguageContextValue {
  language: Locale;
  setLanguage: (locale: Locale) => void;
  // `key` est volontairement `string` (pas une union stricte des clés) : le
  // dictionnaire grossit au fil des écrans traduits et une union stricte
  // obligerait à toucher ce fichier à chaque nouvelle clé. La sécurité vient
  // plutôt du repli sur le français ci-dessous (jamais de clé brute affichée
  // à l'écran) et de la vérification manuelle à la fin de chaque écran
  // traduit.
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Fournit la langue active à toute l'app (voir app/layout.tsx) — lue
// d'abord en localStorage (disponible immédiatement, y compris avant
// connexion : écran de connexion, pages légales), puis alignée sur le
// profil Firestore une fois connecté·e (pour suivre le compte d'un appareil
// à l'autre, voir lib/authProfile.ts).
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isLocale(stored)) setLanguageState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Une fois connecté·e, la langue enregistrée sur le compte (si elle
  // existe) prime sur celle de l'appareil — pour retrouver le même réglage
  // en se connectant depuis un autre appareil. Ne redemande pas confirmation
  // : le choix le plus récent connu pour ce compte s'applique directement.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const { getCloudProfile } = await import("@/lib/authProfile");
      const profile = await getCloudProfile(user.uid).catch(() => null);
      if (profile?.language && isLocale(profile.language)) {
        setLanguageState(profile.language);
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, profile.language);
      }
    });
    return () => unsubscribe();
  }, []);

  function setLanguage(locale: Locale) {
    setLanguageState(locale);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    const user = auth.currentUser;
    if (user) {
      updateDisplaySettings(user.uid, { language: locale }).catch(() => {
        // Pas grave si ça échoue (hors-ligne, document pas encore créé...) —
        // localStorage reste la source de vérité pour cet appareil.
      });
    }
  }

  function t(key: string, vars?: Record<string, string | number>): string {
    const raw = DICTIONARIES[language][key] ?? DICTIONARIES.fr[key] ?? key;
    return interpolate(raw, vars);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation doit être utilisé sous LanguageProvider");
  }
  return ctx;
}
