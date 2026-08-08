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
// Nombre de recettes compatibles avec le régime/les allergies, tous jours
// confondus — sert à distinguer, côté interface, "aucune recette ne
// correspond à ton régime" de "aucune recette ne colle à ce qui est prévu
// aujourd'hui précisément" (voir RecipesContent.tsx).
export function countDietCompatibleRecipes(preferences: UserPreferences): number {
  return recipes.filter((recipe) => isRecipeCompatible(recipe, preferences)).length;
}

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
    // Une recette avec ZÉRO ingrédient déjà prévu aujourd'hui n'est pas "à
    // cuisiner avec ce qui est prévu ce jour-là" — ce serait juste une
    // recette au hasard entièrement à acheter, ce qui contredit la promesse
    // de cet onglet (voir aussi le message vide dédié dans RecipesContent).
    .filter((match) => match.matchedCount > 0)
    .sort((a, b) => {
      const ratioA = a.matchedCount / a.totalCount;
      const ratioB = b.matchedCount / b.totalCount;
      if (ratioB !== ratioA) return ratioB - ratioA;
      return b.matchedCount - a.matchedCount;
    })
    .slice(0, limit);
}
