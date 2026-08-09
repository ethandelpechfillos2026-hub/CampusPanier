"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface LegalLayoutProps {
  title: string;
  updated?: string;
  children: ReactNode;
}

// Mise en page commune à toutes les pages légales (mentions légales, CGU,
// confidentialité, cookies) — cohérente visuellement avec le reste de l'app,
// avec un lien de retour et un style de texte adapté à de longs paragraphes.
export default function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5">
      <div className="space-y-5 pb-8">
        <div>
          <Link
            href="/"
            className="text-xs font-semibold text-campus-terracotta underline"
          >
            {t("legalLayout.backToApp")}
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-campus-ink">{title}</h1>
          {updated && (
            <p className="mt-1 text-xs text-campus-muted">
              {t("legalLayout.lastUpdated", { date: updated })}
            </p>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border-2 border-campus-sand bg-campus-surface p-5 text-sm leading-relaxed text-campus-ink">
          {children}
        </div>
      </div>
    </div>
  );
}
