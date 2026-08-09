"use client";

import { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

// Marqueur visuel pour toute information que seul l'éditeur (Ethan) peut
// fournir — jamais déduite ni inventée. Voir aussi
// "A-COMPLETER-AVANT-PUBLICATION.md" à la racine du projet, qui liste tous
// ces champs au même endroit.
export function Placeholder({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <span className="rounded bg-yellow-200 px-1.5 py-0.5 font-semibold text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-200">
      {t("legalPlaceholder.toCompletePrefix")}
      {children}]
    </span>
  );
}

// Marqueur pour un point qui nécessite un choix (produit ou juridique) avant
// publication, plutôt qu'une simple information factuelle manquante.
export function DecisionNeeded({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-900 dark:bg-blue-900/50 dark:text-blue-200">
      {t("legalPlaceholder.decisionNeededPrefix")}
      {children}]
    </span>
  );
}

// Marqueur pour un point qui doit être vérifié par un professionnel du droit
// avant toute diffusion publique large.
export function LawyerCheck({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <span className="rounded bg-red-100 px-1.5 py-0.5 font-semibold text-red-900 dark:bg-red-900/50 dark:text-red-200">
      {t("legalPlaceholder.lawyerCheckPrefix")}
      {children}]
    </span>
  );
}
