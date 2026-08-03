"use client";

import { useMemo, useState } from "react";
import Mascot from "@/components/Mascot";
import {
  buildWeeklyPlan,
  DAY_SLOT_ORDER,
  WEEKDAY_LABELS,
} from "@/lib/generateMenu";
import { suggestRecipes } from "@/lib/generateRecipes";
import { generateRecipeWithAI } from "@/lib/generateRecipeWithAI";
import { products } from "@/lib/generateShoppingList";
import { recordRecipeViewed } from "@/lib/stats";
import {
  GeneratedRecipe,
  ShoppingListResult,
  UserPreferences,
} from "@/lib/types";

interface RecipesContentProps {
  result: ShoppingListResult;
  preferences: UserPreferences;
  onRestart: () => void;
}

export default function RecipesContent({
  result,
  preferences,
  onRestart,
}: RecipesContentProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  // Les recettes doivent utiliser uniquement ce qui est déjà prévu CE
  // JOUR-LÀ dans "Mon menu" — pas toute la liste de courses de la semaine.
  // Sinon une recette "prête" avec des ingrédients "déjà dans ta liste"
  // pouvait en réalité piocher dans des produits réservés à un autre jour
  // (ex : le riz prévu mercredi utilisé pour une recette lundi), ce qui
  // déséquilibre le reste de la semaine une fois consommé en avance.
  const { days } = useMemo(() => buildWeeklyPlan(result.items), [result.items]);
  const dayIds = useMemo(() => {
    const day = days[selectedDay];
    const ids = new Set<string>();
    for (const slot of DAY_SLOT_ORDER) {
      for (const entry of day.slots[slot]) ids.add(entry.product.id);
    }
    // Les condiments (huile, sel, sucre...) ne sont jamais assignés à un
    // jour précis dans "Mon menu" — ils sont là toute la semaine, donc
    // toujours disponibles pour une recette, peu importe le jour choisi.
    for (const item of result.items) {
      if (item.product.isCondiment) ids.add(item.product.id);
    }
    return ids;
  }, [days, selectedDay, result.items]);

  const matches = suggestRecipes(dayIds, preferences);

  // Pour distinguer, parmi les ingrédients manquants ce jour-là, ceux qui
  // sont déjà dans la liste de la semaine mais prévus un AUTRE jour
  // (attention à ne pas les utiliser en avance) de ceux qu'il faut vraiment
  // ajouter à la liste.
  const weekCartIds = useMemo(
    () => new Set(result.items.map((item) => item.product.id)),
    [result.items]
  );

  const [aiRecipe, setAiRecipe] = useState<GeneratedRecipe | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleGenerateAiRecipe() {
    setAiLoading(true);
    setAiError(null);
    try {
      const ingredientNames = Array.from(dayIds)
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is (typeof products)[number] => Boolean(p))
        .map((product) => product.shortName ?? product.name);
      const recipe = await generateRecipeWithAI(
        ingredientNames,
        preferences.diet,
        preferences.allergies
      );
      setAiRecipe(recipe);
      recordRecipeViewed(`ai-${Date.now()}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "La génération a échoué.";
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">Mes recettes</h1>
        <p className="mt-1 text-sm text-campus-muted">
          À cuisiner avec ce qui est déjà prévu ce jour-là dans &quot;Mon
          menu&quot; — pas avec des produits réservés à un autre jour.
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {WEEKDAY_LABELS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setSelectedDay(index)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              selectedDay === index
                ? "bg-campus-terracotta text-white"
                : "bg-white text-campus-muted border border-campus-sand"
            }`}
          >
            {label.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-campus-terracotta/30 bg-campus-terracotta/5 p-4">
        {!aiRecipe ? (
          <div className="flex items-center gap-3">
            <Mascot mood="happy" size={48} />
            <div className="flex-1">
              <p className="text-sm font-bold text-campus-ink">
                Envie d&apos;autre chose ?
              </p>
              <p className="text-xs text-campus-muted">
                Génère une recette originale avec l&apos;IA, à partir de ce
                qui est prévu ce jour-là.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white text-3xl">
                {aiRecipe.icon}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-campus-ink">
                  {aiRecipe.name}
                </p>
                <p className="mt-1 text-xs text-campus-muted">
                  {aiRecipe.prepTime} min · {aiRecipe.difficulty} · ✨
                  généré par IA
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-campus-muted">
                Ingrédients utilisés
              </h3>
              <ul className="space-y-1 text-sm text-campus-ink">
                {aiRecipe.usedIngredients.map((ingredient, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span>✓</span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-campus-muted">
                Préparation
              </h3>
              <ol className="space-y-2 text-sm text-campus-ink">
                {aiRecipe.steps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-bold text-campus-terracotta">
                      {index + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {aiError && (
          <p className="mt-3 text-xs font-medium text-campus-danger">
            {aiError}
          </p>
        )}

        <button
          type="button"
          onClick={handleGenerateAiRecipe}
          disabled={aiLoading}
          className="btn-primary mt-3 disabled:opacity-60"
        >
          {aiLoading
            ? "Génération en cours..."
            : aiRecipe
            ? "🔄 Générer une autre recette"
            : "✨ Générer une recette IA"}
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-campus-sand bg-white p-5 text-center">
          <p className="text-sm text-campus-muted">
            Pas encore de recette compatible avec ton régime ou tes
            allergies — essaie un autre jour de la semaine.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map(({ recipe, matchedCount, totalCount, missingProducts }) => {
            const isOpen = openId === recipe.id;
            return (
              <div
                key={recipe.id}
                className="overflow-hidden rounded-2xl border border-campus-sand bg-white"
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!isOpen) recordRecipeViewed(recipe.id);
                    setOpenId(isOpen ? null : recipe.id);
                  }}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-campus-sand text-3xl">
                    {recipe.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-campus-ink">
                      {recipe.name}
                    </span>
                    <span className="mt-1 block text-xs text-campus-muted">
                      {recipe.prepTime} min · {recipe.difficulty} ·{" "}
                      {matchedCount}/{totalCount} déjà prévus ce jour-là
                    </span>
                  </span>
                  <span className="text-campus-muted">{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-campus-sand p-4">
                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-campus-muted">
                        Ingrédients
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {recipe.ingredientIds.map((id) => {
                          const product = products.find((p) => p.id === id);
                          const missing = missingProducts.some((p) => p.id === id);
                          const scheduledAnotherDay = missing && weekCartIds.has(id);
                          return (
                            <li
                              key={id}
                              className={`flex items-center gap-2 ${
                                missing ? "text-campus-muted" : "text-campus-ink"
                              }`}
                            >
                              <span>{missing ? "＋" : "✓"}</span>
                              <span>
                                {product?.shortName ?? product?.name ?? id}
                                {scheduledAnotherDay
                                  ? " (prévu un autre jour)"
                                  : missing
                                  ? " (à ajouter)"
                                  : ""}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-campus-muted">
                        Préparation
                      </h3>
                      <ol className="space-y-2 text-sm text-campus-ink">
                        {recipe.steps.map((step, index) => (
                          <li key={index} className="flex gap-2">
                            <span className="font-bold text-campus-terracotta">
                              {index + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button type="button" onClick={onRestart} className="btn-primary">
        Refaire
      </button>
    </div>
  );
}
