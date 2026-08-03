import recipesData from "@/data/recipes.json";
import { products } from "@/lib/generateShoppingList";
import { Product, Recipe, RecipeMatch, UserPreferences } from "@/lib/types";

const recipes = recipesData as Recipe[];

function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

// A recipe is only suggested if every one of its ingredients is compatible
// with the user's diet and allergies — even ingredients they'd still need
// to buy separately, not just the ones already in the generated list.
function isRecipeCompatible(recipe: Recipe, preferences: UserPreferences): boolean {
  return recipe.ingredientIds.every((id) => {
    const product = getProduct(id);
    if (!product) return false;
    const dietOk = product.dietTags.includes(preferences.diet);
    const allergenOk = !product.allergens.some((a) =>
      preferences.allergies.includes(a)
    );
    return dietOk && allergenOk;
  });
}

// `cartIds` doit être les produits RÉELLEMENT disponibles pour le moment
// visé — le jour précis de "Mon menu", pas toute la liste de courses de la
// semaine. Sans cette distinction, une recette "déjà prête" avec des
// ingrédients "dans ta liste" pouvait en fait piocher dans des produits
// réservés à d'autres jours du planning (ex : le riz prévu mercredi), ce
// qui déséquilibrait le reste de la semaine une fois utilisé en avance.
export function suggestRecipes(
  cartIds: Set<string>,
  preferences: UserPreferences,
  limit = 4
): RecipeMatch[] {
  return recipes
    .filter((recipe) => isRecipeCompatible(recipe, preferences))
    .map((recipe) => {
      const ingredients = recipe.ingredientIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p));
      const matchedCount = ingredients.filter((p) => cartIds.has(p.id)).length;
      const missingProducts = ingredients.filter((p) => !cartIds.has(p.id));

      return {
        recipe,
        matchedCount,
        totalCount: ingredients.length,
        missingProducts,
      };
    })
    .sort((a, b) => {
      const ratioA = a.matchedCount / a.totalCount;
      const ratioB = b.matchedCount / b.totalCount;
      if (ratioB !== ratioA) return ratioB - ratioA;
      return b.matchedCount - a.matchedCount;
    })
    .slice(0, limit);
}
