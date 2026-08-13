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

      // Les condiments (huile, ail, crème fraîche, beurre, chapelure...) sont
      // ajoutés à `cartIds` pour TOUS les jours (voir RecipesContent.tsx) —
      // c'est correct, une bouteille d'huile sert toute la semaine. Mais ça
      // veut dire qu'ils étaient comptés comme un match "à part entière" dans
      // le ratio ci-dessous, alors même leur date reste identique tous les
      // jours de la semaine. Résultat (retour utilisateur du 13 août 2026) :
      // une recette composée pour moitié de condiments (ex : Saint-Jacques,
      // beurre, ail, persil — 3 condiments sur 4 ingrédients) obtenait un
      // ratio artificiellement élevé et STABLE, et gagnait le classement
      // TOUS les jours, quel que soit le vrai plat prévu ce jour-là — au
      // détriment de recettes utilisant de vrais ingrédients du panier
      // (pâtes, pois chiches, mozzarella, thon...) mais réparties sur des
      // jours précis pour varier les repas (voir generateMenu.ts). On note
      // donc le score sur les ingrédients NON-condiments uniquement — les
      // condiments restent comptés dans `matchedCount`/`totalCount` (affichés
      // tels quels dans "X/Y déjà dans ta liste"), seul le classement change.
      const scoredIngredients = ingredients.filter((p) => !p.isCondiment);
      const scoredMatchedCount = scoredIngredients.filter((p) =>
        cartIds.has(p.id)
      ).length;
      const scoredTotalCount = scoredIngredients.length || 1;

      return {
        recipe,
        matchedCount,
        totalCount: ingredients.length,
        missingProducts,
        scoredMatchedCount,
        scoredTotalCount,
      };
    })
    // Une recette dont le SEUL ingrédient déjà prévu ce jour-là est un
    // condiment (huile, sel...) n'est pas vraiment "à cuisiner avec ce qui
    // est prévu aujourd'hui" — ce serait quand même tout acheter à part
    // entière. On exige donc au moins un ingrédient non-condiment déjà
    // planifié, pas juste `matchedCount > 0` (voir commentaire ci-dessus).
    .filter((match) => match.scoredMatchedCount > 0)
    .sort((a, b) => {
      const ratioA = a.scoredMatchedCount / a.scoredTotalCount;
      const ratioB = b.scoredMatchedCount / b.scoredTotalCount;
      if (ratioB !== ratioA) return ratioB - ratioA;
      if (b.scoredMatchedCount !== a.scoredMatchedCount) {
        return b.scoredMatchedCount - a.scoredMatchedCount;
      }
      return b.matchedCount - a.matchedCount;
    })
    .slice(0, limit)
    .map(({ recipe, matchedCount, totalCount, missingProducts }) => ({
      recipe,
      matchedCount,
      totalCount,
      missingProducts,
    }));
}
