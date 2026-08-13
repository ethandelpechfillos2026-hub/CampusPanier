"use client";

import { useTranslation } from "@/lib/i18n/LanguageContext";

interface PathChoiceStepProps {
  onChooseDirect: () => void;
  onChooseAutoPlan: () => void;
  onChooseIngredients: () => void;
  onEditBudget: () => void;
}

// Écran affiché juste après le budget (profil + objectifs déjà connus à ce
// stade) : deux façons d'obtenir sa liste de courses, sans jamais dupliquer
// la logique de génération elle-même (voir CampusPanierApp.tsx,
// computeAndApplyList) :
//
// - Option 1 "Liste directe" : comportement historique de l'app, inchangé.
// - Option 2 "Planifier ma semaine" : nouveau, avec deux façons de démarrer
//   (génération automatique, ou choix des ingrédients à la main) — les deux
//   mènent ensuite à un écran de validation de la semaine avant de
//   rejoindre les mêmes onglets Résultats qu'aujourd'hui.
export default function PathChoiceStep({
  onChooseDirect,
  onChooseAutoPlan,
  onChooseIngredients,
  onEditBudget,
}: PathChoiceStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">
          {t("pathChoice.title")}
        </h1>
        <p className="mt-1 text-sm text-campus-muted">
          {t("pathChoice.subtitle")}
        </p>
      </div>

      <div className="flex-1 space-y-4">
        <button
          type="button"
          onClick={onChooseDirect}
          className="flex w-full flex-col items-start gap-1 rounded-2xl border-2 border-campus-terracotta bg-campus-terracotta/10 p-4 text-left transition-colors hover:bg-campus-terracotta/15"
        >
          <span className="text-sm font-bold text-campus-terracotta">
            {t("pathChoice.directTitle")}
          </span>
          <span className="text-xs text-campus-muted">
            {t("pathChoice.directHint")}
          </span>
        </button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-campus-sand" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-campus-muted">
            {t("pathChoice.orDivider")}
          </span>
          <span className="h-px flex-1 bg-campus-sand" />
        </div>

        <div className="space-y-2 rounded-2xl border border-campus-sand bg-campus-surface p-4">
          <p className="text-sm font-bold text-campus-ink">
            {t("pathChoice.planTitle")}
          </p>
          <p className="text-xs text-campus-muted">
            {t("pathChoice.planHint")}
          </p>

          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={onChooseAutoPlan}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-campus-sand px-3 py-2.5 text-left transition-colors hover:border-campus-terracotta/50"
            >
              <span className="text-lg">🤖</span>
              <span>
                <span className="block text-sm font-semibold text-campus-ink">
                  {t("pathChoice.autoTitle")}
                </span>
                <span className="block text-[11px] text-campus-muted">
                  {t("pathChoice.autoHint")}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={onChooseIngredients}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-campus-sand px-3 py-2.5 text-left transition-colors hover:border-campus-terracotta/50"
            >
              <span className="text-lg">🥕</span>
              <span>
                <span className="block text-sm font-semibold text-campus-ink">
                  {t("pathChoice.ingredientsTitle")}
                </span>
                <span className="block text-[11px] text-campus-muted">
                  {t("pathChoice.ingredientsHint")}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onEditBudget}
        className="text-center text-xs text-campus-muted underline"
      >
        {t("pathChoice.editBudgetButton")}
      </button>
    </div>
  );
}
