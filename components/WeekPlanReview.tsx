"use client";

import { useState } from "react";
import {
  buildWeeklyPlan,
  DAY_SLOT_ICONS,
  DAY_SLOT_LABEL_KEYS,
  DAY_SLOT_ORDER,
  formatDayEntryQuantity,
  WEEKDAY_LABEL_KEYS,
} from "@/lib/generateMenu";
import { findSubstitutes, formatPrice } from "@/lib/generateShoppingList";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Product, ShoppingListResult, UserPreferences } from "@/lib/types";

interface WeekPlanReviewProps {
  result: ShoppingListResult;
  preferences: UserPreferences;
  // Restreint les remplacements proposés au même ensemble d'ingrédients que
  // ceux choisis dans IngredientPickerStep.tsx — `undefined` pour une
  // semaine générée automatiquement (aucune restriction, voir
  // lib/generateShoppingList.ts).
  allowedProductIds: Set<string> | undefined;
  onSwapProduct: (oldProductId: string, newProduct: Product) => void;
  onValidate: () => void;
  onRestart: () => void;
}

// Écran "Semaine à valider" du planificateur de repas (parcours 2A et 2B,
// voir CampusPanierApp.tsx) : affiche la semaine construite par le moteur
// existant (buildWeeklyPlan, inchangé — voir MenuContent.tsx pour le même
// usage côté "Mon menu") et permet d'échanger un repas qu'on n'aime pas
// avant de valider, en réutilisant tel quel le mécanisme d'échange déjà
// construit pour "Ma liste" (findSubstitutes + onSwapProduct, voir
// ResultsContent.tsx) — jamais de logique de remplacement dupliquée.
export default function WeekPlanReview({
  result,
  preferences,
  allowedProductIds,
  onSwapProduct,
  onValidate,
  onRestart,
}: WeekPlanReviewProps) {
  const { t } = useTranslation();
  const [selectedDay, setSelectedDay] = useState(0);
  const [swapTarget, setSwapTarget] = useState<Product | null>(null);
  const [substitutes, setSubstitutes] = useState<Product[]>([]);

  const { days } = buildWeeklyPlan(result.items, preferences.canteenDays);
  const day = days[selectedDay];

  function handleOpenSwap(product: Product) {
    const excludeIds = new Set(result.items.map((item) => item.product.id));
    setSubstitutes(findSubstitutes(product, preferences, excludeIds, allowedProductIds));
    setSwapTarget(product);
  }

  function handleChooseSubstitute(newProduct: Product) {
    if (!swapTarget) return;
    onSwapProduct(swapTarget.id, newProduct);
    setSwapTarget(null);
    setSubstitutes([]);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">
          {t("weekPlanReview.title")}
        </h1>
        <p className="mt-1 text-sm text-campus-muted">
          {t("weekPlanReview.subtitle", { total: formatPrice(result.total) })}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {WEEKDAY_LABEL_KEYS.map((labelKey, index) => (
          <button
            key={labelKey}
            type="button"
            onClick={() => setSelectedDay(index)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              selectedDay === index
                ? "bg-campus-terracotta text-white"
                : "bg-campus-surface text-campus-muted border border-campus-sand"
            }`}
          >
            {t(labelKey).slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {DAY_SLOT_ORDER.map((slot) => {
          const entries = day.slots[slot];
          return (
            <section
              key={slot}
              className="rounded-2xl border border-campus-sand bg-campus-surface p-4"
            >
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-campus-ink">
                <span className="text-lg">{DAY_SLOT_ICONS[slot]}</span>
                {t(DAY_SLOT_LABEL_KEYS[slot])}
              </h2>

              {entries.length === 0 ? (
                <p className="text-sm text-campus-muted">
                  {t("weekPlanReview.nothingPlanned")}
                </p>
              ) : (
                <ul className="space-y-1">
                  {entries.map(({ product, count }) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenSwap(product)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-orange-50/60 dark:hover:bg-white/5"
                      >
                        <span className="text-sm font-medium text-campus-ink">
                          {product.shortName ?? product.name}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-campus-terracotta">
                          {formatDayEntryQuantity(product, count)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button type="button" onClick={onValidate} className="btn-primary">
          {t("weekPlanReview.validateButton")}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="text-center text-xs text-campus-muted underline"
        >
          {t("weekPlanReview.restartButton")}
        </button>
      </div>

      {swapTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-5"
          onClick={() => setSwapTarget(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-campus-surface p-5 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-campus-ink">
                {swapTarget.shortName ?? swapTarget.name}
              </h3>
              <button
                type="button"
                onClick={() => setSwapTarget(null)}
                aria-label={t("common.close")}
                className="shrink-0 text-2xl leading-none text-campus-muted"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-xs text-campus-muted">
              {t("weekPlanReview.swapHint")}
            </p>

            {substitutes.length === 0 ? (
              <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">
                {t("resultsContent.noSubstitutes")}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {substitutes.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => handleChooseSubstitute(candidate)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-campus-sand px-3 py-2.5 text-left transition-colors hover:border-campus-terracotta"
                    >
                      <span className="text-sm font-semibold text-campus-ink">
                        {candidate.shortName ?? candidate.name}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-campus-terracotta">
                        {formatPrice(candidate.price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSwapTarget(null)}
                className="btn-secondary"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
