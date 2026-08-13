"use client";

import { useMemo, useState } from "react";
import { filterProducts } from "@/lib/generateShoppingList";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { CATEGORY_LABEL_KEYS, CATEGORY_ORDER, UserPreferences } from "@/lib/types";

interface IngredientPickerStepProps {
  preferences: UserPreferences;
  onBack: () => void;
  onConfirm: (selectedIds: Set<string>) => void;
}

// Nombre minimal d'ingrédients choisis avant de pouvoir continuer — sans ce
// garde-fou, une sélection de 1-2 produits ne permettrait jamais de couvrir
// une semaine complète (4 créneaux × 7 jours), et generateShoppingList
// (restreint à ce pool minuscule, voir lib/generateShoppingList.ts)
// produirait une liste très pauvre sans que la personne comprenne pourquoi.
const MIN_INGREDIENTS = 6;

// Étape "Je choisis mes ingrédients" (parcours 2B du planificateur) :
// réutilise EXACTEMENT le même pool de produits que la génération directe
// (filterProducts déjà filtré par régime/allergies/Mode Performance, voir
// lib/generateShoppingList.ts) — jamais une liste de produits dupliquée qui
// pourrait diverger de celle-ci. La suite (quantités, budget strict,
// répartition sur la semaine) est entièrement gérée par le moteur existant
// une fois la sélection confirmée (voir CampusPanierApp.tsx,
// handleIngredientsConfirmed).
export default function IngredientPickerStep({
  preferences,
  onBack,
  onConfirm,
}: IngredientPickerStepProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const pool = useMemo(() => filterProducts(preferences), [preferences]);
  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        products: pool.filter((p) => p.category === category),
      })).filter((group) => group.products.length > 0),
    [pool]
  );

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canContinue = selectedIds.size >= MIN_INGREDIENTS;

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">
          {t("ingredientPicker.title")}
        </h1>
        <p className="mt-1 text-sm text-campus-muted">
          {t("ingredientPicker.subtitle")}
        </p>
      </div>

      <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between gap-3 border-b border-campus-sand/80 bg-campus-cream/95 px-5 py-2 backdrop-blur">
        <p className="text-sm font-semibold text-campus-ink">
          {t("ingredientPicker.selectedCount", { count: selectedIds.size })}
        </p>
        {!canContinue && (
          <p className="text-[11px] text-campus-muted">
            {t("ingredientPicker.minHint", { min: MIN_INGREDIENTS })}
          </p>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pb-2">
        {grouped.map(({ category, products }) => (
          <section key={category}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-campus-muted">
              {t(CATEGORY_LABEL_KEYS[category])}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {products.map((product) => {
                const selected = selectedIds.has(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggle(product.id)}
                    aria-pressed={selected}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      selected
                        ? "border-campus-terracotta bg-campus-terracotta/10 text-campus-terracotta"
                        : "border-campus-sand bg-campus-surface text-campus-ink hover:border-campus-terracotta/50"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 text-[10px] font-bold ${
                        selected
                          ? "border-campus-terracotta bg-campus-terracotta text-white"
                          : "border-campus-sand"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <span className="leading-tight">
                      {product.shortName ?? product.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={() => onConfirm(selectedIds)}
          disabled={!canContinue}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("ingredientPicker.confirmButton")}
        </button>
        <button type="button" onClick={onBack} className="btn-back">
          <span aria-hidden="true">←</span>
          {t("ingredientPicker.backButton")}
        </button>
      </div>
    </div>
  );
}
