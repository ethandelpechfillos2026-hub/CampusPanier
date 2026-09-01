"use client";

import { useMemo, useState } from "react";
import Mascot from "@/components/Mascot";
import {
  buildWeeklyPlan,
  DAY_SLOT_LABEL_KEYS,
  DAY_SLOT_ORDER,
  WEEKDAY_LABEL_KEYS,
} from "@/lib/generateMenu";
import { countDietCompatibleRecipes, suggestRecipes } from "@/lib/generateRecipes";
import { generateRecipeWithAI } from "@/lib/generateRecipeWithAI";
import { products } from "@/lib/generateShoppingList";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { recordRecipeViewed } from "@/lib/stats";
import {
  GeneratedRecipe,
  Recipe,
  RecipeMatch,
  ShoppingListResult,
  UserPreferences,
} from "@/lib/types";

interface RecipesContentProps {
  result: ShoppingListResult;
  preferences: UserPreferences;
  onRestart: () => void;
}

// Vraie photo (voir public/recipes/, sourcée via l'API Pexels — retour
// utilisateur du 13 août 2026 : "je veux des vraies photos, pas des
// émojis ou des trucs qui font vraiment IA") au lieu de l'emoji recipe.icon.
// Repli sur l'emoji si l'image ne charge pas (recette future sans photo
// encore associée) plutôt qu'une case cassée.
function RecipeThumbnail({ recipe }: { recipe: Recipe }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-campus-sand text-3xl">
        {recipe.icon}
      </span>
    );
  }

  return (
    <img
      src={`/recipes/${recipe.id}.jpg`}
      alt=""
      className="h-16 w-16 shrink-0 rounded-xl bg-campus-sand object-cover"
      onError={() => setImgFailed(true)}
    />
  );
}

// Bloc de recettes réutilisé pour chaque repas du jour (petit-déjeuner,
// déjeuner, dîner) — même rendu qu'avant (une seule liste), juste répété
// une fois par créneau au lieu d'une fois par jour, voir RecipesContent
// ci-dessous.
function RecipeMatchList({
  matches,
  openId,
  onToggle,
  weekCartIds,
  emptyLabel,
  t,
}: {
  matches: RecipeMatch[];
  openId: string | null;
  onToggle: (id: string) => void;
  weekCartIds: Set<string>;
  emptyLabel: string;
  t: (key: string) => string;
}) {
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-campus-sand bg-campus-surface p-5 text-center">
        <p className="text-sm text-campus-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map(({ recipe, matchedCount, totalCount, missingProducts }) => {
        const isOpen = openId === recipe.id;
        return (
          <div
            key={recipe.id}
            className="overflow-hidden rounded-2xl border border-campus-sand bg-campus-surface"
          >
            <button
              type="button"
              onClick={() => {
                if (!isOpen) recordRecipeViewed(recipe.id);
                onToggle(recipe.id);
              }}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <RecipeThumbnail recipe={recipe} />
              <span className="flex-1">
                <span className="block text-sm font-bold text-campus-ink">
                  {recipe.name}
                </span>
                <span className="mt-1 block text-xs text-campus-muted">
                  {recipe.prepTime} min ·{" "}
                  {recipe.difficulty === "moyen"
                    ? t("recipesContent.difficultyMoyen")
                    : t("recipesContent.difficultyFacile")}{" "}
                  · {matchedCount}/{totalCount} {t("recipesContent.alreadyPlannedToday")}
                </span>
              </span>
              <span className="text-campus-muted">{isOpen ? "−" : "+"}</span>
            </button>

            {isOpen && (
              <div className="space-y-4 border-t border-campus-sand p-4">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-campus-muted">
                    {t("recipesContent.ingredients")}
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
                              ? ` ${t("recipesContent.scheduledAnotherDay")}`
                              : missing
                              ? ` ${t("recipesContent.toAdd")}`
                              : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-campus-muted">
                    {t("recipesContent.preparation")}
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
  );
}

export default function RecipesContent({
  result,
  preferences,
  onRestart,
}: RecipesContentProps) {
  const { t, language } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  // Les recettes doivent utiliser uniquement ce qui est déjà prévu CE
  // JOUR-LÀ dans "Mon menu" — pas toute la liste de courses de la semaine.
  // Sinon une recette "prête" avec des ingrédients "déjà dans ta liste"
  // pouvait en réalité piocher dans des produits réservés à un autre jour
  // (ex : le riz prévu mercredi utilisé pour une recette lundi), ce qui
  // déséquilibre le reste de la semaine une fois consommé en avance.
  const { days } = useMemo(
    () => buildWeeklyPlan(result.items, preferences.canteenDays),
    [result.items, preferences.canteenDays]
  );

  // Condiments (huile, sel, sucre...) : jamais assignés à un jour précis
  // dans "Mon menu" — ils sont là toute la semaine, donc toujours
  // disponibles pour une recette, peu importe le repas/jour choisi.
  const condimentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of result.items) {
      if (item.product.isCondiment) ids.add(item.product.id);
    }
    return ids;
  }, [result.items]);

  function idsForSlot(slot: (typeof DAY_SLOT_ORDER)[number]): Set<string> {
    const ids = new Set(condimentIds);
    for (const entry of days[selectedDay].slots[slot]) ids.add(entry.product.id);
    return ids;
  }

  // Une recette par repas du jour plutôt qu'une seule liste mélangeant
  // petit-déjeuner et repas du midi/soir — retour utilisateur (1er
  // septembre 2026) : "lundi, la recette que j'ai en premier, c'est le
  // petit-déjeuner [...] juste en dessous, la recette du midi ou du soir".
  // suggestRecipes filtre déjà par créneau (mealSlotFilter) pour ne jamais
  // proposer un porridge comme idée de dîner. Le déjeuner est simplement
  // absent le jour où il est mangé à la cantine (day.slots.dejeuner vide),
  // pas besoin de section vide à afficher ce jour-là.
  const breakfastMatches = suggestRecipes(
    idsForSlot("petitDejeuner"),
    preferences,
    3,
    "petit-dejeuner"
  );
  const lunchMatches =
    days[selectedDay].slots.dejeuner.length > 0
      ? suggestRecipes(idsForSlot("dejeuner"), preferences, 3, "dejeuner-diner")
      : null;
  const dinnerMatches = suggestRecipes(
    idsForSlot("diner"),
    preferences,
    3,
    "dejeuner-diner"
  );

  const dietCompatibleCount = useMemo(
    () => countDietCompatibleRecipes(preferences),
    [preferences]
  );

  // Pour la génération IA ci-dessous : garde le comportement existant, basé
  // sur tout ce qui est prévu ce jour-là (petit-déj + repas), pas restreint
  // à un seul repas.
  const dayIds = useMemo(() => {
    const ids = new Set(condimentIds);
    for (const slot of DAY_SLOT_ORDER) {
      for (const entry of days[selectedDay].slots[slot]) ids.add(entry.product.id);
    }
    return ids;
  }, [days, selectedDay, condimentIds]);

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
  // Noms des recettes déjà générées dans cette session — envoyés à l'IA pour
  // qu'elle évite de reproduire le même style de plat (souvent "salade")
  // encore et encore quand on clique plusieurs fois sur "Générer une autre
  // recette".
  const [aiRecipeHistory, setAiRecipeHistory] = useState<string[]>([]);

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
        preferences.allergies,
        aiRecipeHistory,
        language
      );
      setAiRecipe(recipe);
      setAiRecipeHistory((prev) => [...prev, recipe.name]);
      recordRecipeViewed(`ai-${Date.now()}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("recipesContent.aiGenerationFailed");
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">{t("recipesContent.title")}</h1>
        <p className="mt-1 text-sm text-campus-muted">
          {t("recipesContent.subtitle")}
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

      <div className="rounded-2xl border border-campus-terracotta/30 bg-campus-terracotta/5 p-4">
        {!aiRecipe ? (
          <div className="flex items-center gap-3">
            <Mascot mood="happy" size={48} />
            <div className="flex-1">
              <p className="text-sm font-bold text-campus-ink">
                {t("recipesContent.aiPromptTitle")}
              </p>
              <p className="text-xs text-campus-muted">
                {t("recipesContent.aiPromptHint")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-campus-surface text-3xl">
                {aiRecipe.icon}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-campus-ink">
                  {aiRecipe.name}
                </p>
                <p className="mt-1 text-xs text-campus-muted">
                  {aiRecipe.prepTime} min ·{" "}
                  {aiRecipe.difficulty === "moyen" ? t("recipesContent.difficultyMoyen") : t("recipesContent.difficultyFacile")}{" "}
                  · ✨ {t("recipesContent.aiGeneratedBy")}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-campus-muted">
                {t("recipesContent.usedIngredients")}
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
                {t("recipesContent.preparation")}
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
            ? t("recipesContent.aiGenerating")
            : aiRecipe
            ? t("recipesContent.aiRegenerateButton")
            : t("recipesContent.aiGenerateButton")}
        </button>
      </div>

      {dietCompatibleCount === 0 ? (
        <div className="rounded-2xl border border-campus-sand bg-campus-surface p-5 text-center">
          <p className="text-sm text-campus-muted">
            {t("recipesContent.noCompatibleRecipe")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-bold text-campus-ink">
              {t(DAY_SLOT_LABEL_KEYS.petitDejeuner)}
            </h2>
            <RecipeMatchList
              matches={breakfastMatches}
              openId={openId}
              onToggle={(id) => setOpenId(openId === id ? null : id)}
              weekCartIds={weekCartIds}
              emptyLabel={t("recipesContent.noMatchToday")}
              t={t}
            />
          </div>

          {lunchMatches !== null && (
            <div>
              <h2 className="mb-2 text-sm font-bold text-campus-ink">
                {t(DAY_SLOT_LABEL_KEYS.dejeuner)}
              </h2>
              <RecipeMatchList
                matches={lunchMatches}
                openId={openId}
                onToggle={(id) => setOpenId(openId === id ? null : id)}
                weekCartIds={weekCartIds}
                emptyLabel={t("recipesContent.noMatchToday")}
                t={t}
              />
            </div>
          )}

          <div>
            <h2 className="mb-2 text-sm font-bold text-campus-ink">
              {t(DAY_SLOT_LABEL_KEYS.diner)}
            </h2>
            <RecipeMatchList
              matches={dinnerMatches}
              openId={openId}
              onToggle={(id) => setOpenId(openId === id ? null : id)}
              weekCartIds={weekCartIds}
              emptyLabel={t("recipesContent.noMatchToday")}
              t={t}
            />
          </div>
        </div>
      )}

      <button type="button" onClick={onRestart} className="btn-primary">
        {t("resultsContent.redo")}
      </button>
    </div>
  );
}
