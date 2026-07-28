"use client";

import { useState } from "react";
import { suggestRecipes } from "@/lib/generateRecipes";
import { products } from "@/lib/generateShoppingList";
import { ShoppingListResult, UserPreferences } from "@/lib/types";

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
  const matches = suggestRecipes(result, preferences);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">Mes recettes</h1>
        <p className="mt-1 text-sm text-campus-muted">
          À cuisiner avec les produits de ta liste
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-campus-sand bg-white p-5 text-center">
          <p className="text-sm text-campus-muted">
            Pas encore de recette compatible avec ton régime ou tes allergies.
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
                  onClick={() => setOpenId(isOpen ? null : recipe.id)}
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
                      {matchedCount}/{totalCount} déjà dans ta liste
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
                                {missing ? " (à ajouter)" : ""}
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
