import productsData from "@/data/products.json";
import { getActiveMacroTargets } from "@/lib/macros";
import {
  CATEGORY_ORDER,
  MEAL_SLOT_ORDER,
  Product,
  ShoppingListItem,
  ShoppingListResult,
  UserPreferences,
} from "@/lib/types";

const products = productsData as Product[];

function matchesDiet(product: Product, diet: UserPreferences["diet"]): boolean {
  return product.dietTags.includes(diet);
}

function matchesAllergies(
  product: Product,
  allergies: UserPreferences["allergies"]
): boolean {
  return !product.allergens.some((allergen) => allergies.includes(allergen));
}

function filterProducts(preferences: UserPreferences): Product[] {
  return products.filter(
    (product) =>
      matchesDiet(product, preferences.diet) &&
      matchesAllergies(product, preferences.allergies) &&
      // Mode Performance : uniquement des produits bruts/peu transformés —
      // exclusion pure, pas juste une préférence de score, comme demandé.
      (!preferences.performanceMode || !product.ultraTransforme)
  );
}

// Score a product against the user's nutritional preferences. This is a
// simple heuristic to prioritize matching items when filling the basket —
// not a real nutrition engine (no per-meal or per-day calorie modeling).
// A proper calorie/macro-accurate plan would need a recipe/serving-size
// database, which is out of scope for this MVP.
function score(product: Product, preferences: UserPreferences): number {
  let s = 0;
  const prefs = preferences.macroPreferences;

  if (prefs.includes("riche-proteines") && product.protein === "riche") s += 2;
  if (prefs.includes("faible-lipides") && product.lipides === "faible") s += 2;
  if (prefs.includes("riche-glucides") && product.glucides === "riche") s += 2;
  if (prefs.includes("faible-sel") && product.sel === "faible") s += 2;
  if (prefs.includes("faible-sel") && product.sel === "riche") s -= 2;
  if (prefs.includes("facile") && product.easyToCook) s += 2;

  // Objectifs "silhouette" : des heuristiques simples (pas un vrai bilan
  // nutritionnel) basées sur les seuls champs qu'on a — protéines/lipides/
  // kcal, ou catégorie pour la peau (fruits et légumes = vitamines/
  // antioxydants).
  if (prefs.includes("prise-masse")) {
    if (product.protein === "riche") s += 2;
    if (product.kcal >= 250) s += 1;
  }
  if (prefs.includes("seche")) {
    if (product.protein === "riche") s += 2;
    if (product.lipides === "faible") s += 1;
    if (product.kcal <= 200) s += 1;
  }
  if (prefs.includes("belle-peau") && product.category === "fruits-legumes") {
    s += 3;
  }
  // Pour se faire plaisir même avec un petit budget — priorise les produits
  // "plaisir" (sucré/gras/gourmand) plutôt que les plus équilibrés.
  if (prefs.includes("gourmand") && product.gourmand) {
    s += 3;
  }

  if (preferences.dailyCalories !== null) {
    if (preferences.dailyCalories >= 2400 && product.kcal >= 250) s += 1;
    if (preferences.dailyCalories <= 1800 && product.kcal <= 150) s += 1;
  }

  // Objectifs en grammes : ceux fixés à la main (sportif·ves avisé·es...)
  // priment sur le calcul automatique à partir du profil corporel — voir
  // lib/macros.ts. On regarde la part de chaque macro dans les calories
  // totales visées pour orienter le score, plutôt que le gramme exact
  // (le catalogue n'a que des niveaux faible/moyen/riche, pas de grammes
  // précis par produit).
  const macroTargets = getActiveMacroTargets(preferences, preferences.dailyCalories);
  const highProteinNeed =
    macroTargets !== null ||
    (preferences.dailyCalories !== null && preferences.dailyCalories >= 2400);
  // Sans ce boost, la phase 2 (remplissage du budget, triée par score puis
  // prix croissant) se remplissait surtout de petits produits pas chers —
  // condiments, biscuits, épices — plutôt que de viande, poisson, œufs ou
  // fromage, nettement plus chers au kilo mais bien plus riches en
  // protéines.
  if (highProteinNeed && product.protein === "riche") {
    s += 4;
  }

  if (macroTargets && macroTargets.calories > 0) {
    const lipidesShare = (macroTargets.lipidesG * 9) / macroTargets.calories;
    const glucidesShare = (macroTargets.glucidesG * 4) / macroTargets.calories;

    // Objectif lipides bas (ex : 50 g visés plutôt que 100 g) — on
    // privilégie nettement les produits faibles en lipides et on évite les
    // plus riches, sinon la sélection ignorait complètement cet objectif.
    if (lipidesShare <= 0.22) {
      if (product.lipides === "faible") s += 3;
      if (product.lipides === "riche") s -= 3;
    } else if (lipidesShare >= 0.4) {
      if (product.lipides === "riche") s += 2;
    }

    if (glucidesShare >= 0.55) {
      if (product.glucides === "riche") s += 2;
    } else if (glucidesShare <= 0.3) {
      if (product.glucides === "riche") s -= 2;
      if (product.glucides === "faible") s += 2;
    }
  }

  return s;
}

function cheapestScoredByCategory(
  filtered: Product[],
  category: Product["category"],
  exclude: Set<string>,
  preferences: UserPreferences
): Product | null {
  const candidates = filtered
    .filter((p) => p.category === category && !exclude.has(p.id))
    .sort((a, b) => {
      const scoreDiff = score(b, preferences) - score(a, preferences);
      if (scoreDiff !== 0) return scoreDiff;
      return a.price - b.price;
    });

  return candidates[0] ?? null;
}

function round(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// Au-delà de ce nombre de produits DIFFÉRENTS dans une catégorie, la phase 2
// augmente plutôt la quantité d'un produit déjà choisi — sans ça, un gros
// budget finissait avec 5-6 viandes/poissons différents, ou 8-10 légumes
// différents, en une seule petite portion chacun, plutôt qu'une plus grosse
// quantité de moins de produits — plus cohérent à cuisiner et plus rapide à
// préparer, comme demandé ("augmente les quantités du même produit plutôt
// que plein de produits différents"). Plafonds volontairement bas sur
// toutes les catégories, pas seulement viande-poisson.
const MAX_DISTINCT_PER_CATEGORY: Partial<Record<Product["category"], number>> = {
  epicerie: 4,
  "fruits-legumes": 4,
  frais: 3,
  boulangerie: 3,
  "viande-poisson": 3,
};
const MAX_QUANTITY_PER_ITEM = 3;

export function generateShoppingList(
  preferences: UserPreferences
): ShoppingListResult {
  const filtered = filterProducts(preferences);

  // Catégories réellement atteignables pour ce régime/ces allergies (un
  // profil végan ne verra jamais "Viande et poisson" — c'est un choix de
  // régime, pas un problème de budget, donc on ne la compte pas ici).
  const availableCategories = CATEGORY_ORDER.filter((category) =>
    filtered.some((p) => p.category === category)
  );

  // Coût du panier minimal équilibré : les deux articles les moins chers de
  // chaque catégorie atteignable (un seul article par catégorie serait
  // quasiment gratuit et ne déclencherait jamais ce repère). Sert à savoir
  // si le budget saisi peut, ou non, couvrir un panier complet —
  // indépendamment des préférences nutritionnelles.
  const minimalBalancedCost = round(
    availableCategories.reduce((sum, category) => {
      const cheapestTwo = filtered
        .filter((p) => p.category === category)
        .sort((a, b) => a.price - b.price)
        .slice(0, 2);
      return sum + cheapestTwo.reduce((s, p) => s + p.price, 0);
    }, 0)
  );

  const selected: Product[] = [];
  const selectedIds = new Set<string>();
  const quantities = new Map<string, number>();
  let total = 0;

  // Phase 1 : un article par catégorie, en priorisant ceux qui correspondent
  // le mieux aux préférences nutritionnelles, pour un panier équilibré.
  for (const category of availableCategories) {
    const product = cheapestScoredByCategory(
      filtered,
      category,
      selectedIds,
      preferences
    );
    if (!product || total + product.price > preferences.budget) continue;

    selected.push(product);
    selectedIds.add(product.id);
    quantities.set(product.id, 1);
    total += product.price;
  }

  // Phase 1b : une base réelle par créneau repas (petit-déj, déjeuner/dîner,
  // collation), AVANT de remplir le reste du budget. Sans ça, un profil
  // "gourmand" pouvait finir avec des collations 100 % chips/bonbons/gâteaux
  // et aucun vrai repas certains jours ("Mon menu" avec des trous, ou un
  // dîner réduit à 25 g de fromage râpé) — le budget filait entièrement
  // dans des produits plaisir bon marché avant que l'algorithme ne pense à
  // couvrir chaque moment de la journée. Quand "gourmand" est coché, cette
  // base exclut volontairement les produits "gourmand" : l'idée n'est pas
  // d'interdire les extras, mais de garantir d'abord un fruit/légume/
  // protéine/féculent réel à chaque créneau, les envies plaisir venant se
  // rajouter PAR-DESSUS en phase 2 avec le budget restant.
  const isGourmand = preferences.macroPreferences.includes("gourmand");
  for (const slot of MEAL_SLOT_ORDER) {
    const alreadyCovered = selected.some(
      (p) => p.mealSlot === slot && p.weeklyServings && !p.isCondiment
    );
    if (alreadyCovered) continue;

    const candidates = filtered
      .filter(
        (p) =>
          p.mealSlot === slot &&
          p.weeklyServings &&
          !p.isCondiment &&
          !selectedIds.has(p.id) &&
          (!isGourmand || !p.gourmand)
      )
      .sort((a, b) => {
        const scoreDiff = score(b, preferences) - score(a, preferences);
        if (scoreDiff !== 0) return scoreDiff;
        return a.price - b.price;
      });

    const product = candidates[0];
    if (!product || total + product.price > preferences.budget) continue;

    selected.push(product);
    selectedIds.add(product.id);
    quantities.set(product.id, 1);
    total += product.price;
  }

  // Phase 2 : compléter avec les articles restants (y compris les extras
  // gourmands), en priorisant toujours ceux qui correspondent le mieux aux
  // préférences, puis les moins chers.
  const remaining = filtered
    .filter((p) => !selectedIds.has(p.id))
    .sort((a, b) => {
      const scoreDiff = score(b, preferences) - score(a, preferences);
      if (scoreDiff !== 0) return scoreDiff;
      return a.price - b.price;
    });

  const categoryCounts = new Map<Product["category"], number>();
  for (const p of selected) {
    categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
  }

  for (const product of remaining) {
    const cap = MAX_DISTINCT_PER_CATEGORY[product.category];
    const atCap =
      cap !== undefined && (categoryCounts.get(product.category) ?? 0) >= cap;

    if (atCap) {
      // Plafond atteint pour cette catégorie : plutôt qu'un produit
      // différent de plus, on prend une quantité supplémentaire du meilleur
      // produit déjà choisi dans cette catégorie (dans la limite de
      // MAX_QUANTITY_PER_ITEM) — plus cohérent à cuisiner qu'une multitude
      // de viandes/poissons différents en une seule portion chacun.
      const boostCandidate = selected
        .filter(
          (p) =>
            p.category === product.category &&
            (quantities.get(p.id) ?? 1) < MAX_QUANTITY_PER_ITEM
        )
        .sort((a, b) => {
          const scoreDiff = score(b, preferences) - score(a, preferences);
          if (scoreDiff !== 0) return scoreDiff;
          return a.price - b.price;
        })[0];

      if (boostCandidate && total + boostCandidate.price <= preferences.budget) {
        quantities.set(
          boostCandidate.id,
          (quantities.get(boostCandidate.id) ?? 1) + 1
        );
        total += boostCandidate.price;
      }
      continue;
    }

    if (total + product.price <= preferences.budget) {
      selected.push(product);
      selectedIds.add(product.id);
      quantities.set(product.id, 1);
      categoryCounts.set(
        product.category,
        (categoryCounts.get(product.category) ?? 0) + 1
      );
      total += product.price;
    }
  }

  const roundedTotal = round(total);

  return {
    items: selected.map((product) => ({
      product,
      quantity: quantities.get(product.id) ?? 1,
    })),
    total: roundedTotal,
    budget: preferences.budget,
    remaining: round(Math.max(0, preferences.budget - roundedTotal)),
    isOverBudget: roundedTotal > preferences.budget,
    minimalBalancedCost,
    isBudgetInsufficient: preferences.budget < minimalBalancedCost,
  };
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export { products };
