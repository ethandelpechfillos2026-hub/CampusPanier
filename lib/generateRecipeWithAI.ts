import { Locale } from "@/lib/i18n/locale";
import { Allergen, DietType, GeneratedRecipe } from "@/lib/types";

export async function generateRecipeWithAI(
  ingredientNames: string[],
  diet: DietType,
  allergies: Allergen[],
  avoidNames: string[] = [],
  // Langue dans laquelle la recette doit être générée (voir
  // app/api/generate-recipe/route.ts) — suit la langue choisie dans les
  // réglages (voir lib/i18n/), "fr" par défaut si non fournie.
  locale: Locale = "fr"
): Promise<GeneratedRecipe> {
  const response = await fetch("/api/generate-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredientNames, diet, allergies, avoidNames, locale }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? "Generation failed.");
  }

  return data as GeneratedRecipe;
}
