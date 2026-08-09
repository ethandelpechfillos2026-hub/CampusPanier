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
import { Theme } from "@/lib/types";

const THEME_STORAGE_KEY = "campus-panier-theme";
const DEFAULT_THEME: Theme = "system";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

// Applique/retire la classe `dark` sur <html> — c'est cette classe que tout
// le système de couleurs campus-* suit (voir tailwind.config.ts,
// app/globals.css).
function applyThemeClass(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Fournit le thème (clair/sombre/système) à toute l'app (voir
// app/layout.tsx) — même logique de persistance que LanguageProvider
// (localStorage d'abord, puis alignement sur le profil Firestore une fois
// connecté·e). Un script inline dans app/layout.tsx applique déjà la bonne
// classe AVANT l'hydratation React (évite un flash clair->sombre au
// chargement) ; ce composant prend le relais ensuite pour les changements en
// cours de session.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initial = isTheme(stored) ? stored : DEFAULT_THEME;
    setThemeState(initial);
    applyThemeClass(initial);
  }, []);

  // Thème "système" : suit les changements de préférence OS en direct
  // (ex: bascule automatique le soir) sans recharger la page.
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyThemeClass("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const { getCloudProfile } = await import("@/lib/authProfile");
      const profile = await getCloudProfile(user.uid).catch(() => null);
      if (profile?.theme && isTheme(profile.theme)) {
        setThemeState(profile.theme);
        applyThemeClass(profile.theme);
        window.localStorage.setItem(THEME_STORAGE_KEY, profile.theme);
      }
    });
    return () => unsubscribe();
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    applyThemeClass(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    const user = auth.currentUser;
    if (user) {
      updateDisplaySettings(user.uid, { theme: next }).catch(() => {
        // Pas grave si ça échoue — localStorage reste la source de vérité
        // pour cet appareil.
      });
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme doit être utilisé sous ThemeProvider");
  }
  return ctx;
}
