"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

// Racine des contextes globaux (thème, langue) — voir app/layout.tsx. Un
// seul composant pour ne pas empiler les providers dans layout.tsx lui-même
// (qui reste un composant serveur).
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}
