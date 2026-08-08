import { Allergen, DietType, GeneratedRecipe } from "@/lib/types";

export async function generateRecipeWithAI(
  ingredientNames: string[],
  diet: DietType,
  allergies: Allergen[],
  avoidNames: string[] = []
): Promise<GeneratedRecipe> {
  const response = await fetch("/api/generate-recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredientNames, diet, allergies, avoidNames }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? "La génération a échoué.");
  }

  return data as GeneratedRecipe;
}
