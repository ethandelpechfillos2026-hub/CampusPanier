import productsData from "@/data/products.json";
import { getActiveMacroTargets, getEffectiveDailyCalories } from "@/lib/macros";
import {
  CATEGORY_ORDER,
  MEAL_SLOT_ORDER,
  PriceInfo,
  Product,
  ShoppingListItem,
  ShoppingListResult,
  UserPreferences,
} from "@/lib/types";

const products = productsData as Product[];

// Identifiants des féculents "de base" du catalogue (riz, pâtes, pommes de
// terre...) — liste unique partagée avec generateMenu.ts (familles de
// produits) pour éviter que les deux fichiers dérivent chacun de leur côté.
// Si un produit y figure sans exister dans le catalogue (ex : retiré lors
// d'un nettoyage), il est simplement ignoré partout, sans effet — mais
// autant n'avoir qu'un seul endroit à mettre à jour.
export const FECULENT_IDS = new Set([
  "riz", "pates", "pommes-de-terre", "quinoa", "semoule-couscous",
  "riz-complet", "pates-completes", "spaghetti", "polenta",
  "patate-douce", "nouilles-chinoises",
]);

function matchesDiet(product: Product, diet: UserPreferences["diet"]): boolean {
  return product.dietTags.includes(diet);
}

function matchesAllergies(
  product: Product,
  allergies: UserPreferences["allergies"]
): boolean {
  return !product.allergens.some((allergen) => allergies.includes(allergen));
}

// Résout le prix "effectif" d'un produit selon l'enseigne préférée de la
// personne (si elle en a choisi une, et si le catalogue a un relevé pour
// cette enseigne dans Product.priceObservations) — AVANT de lancer le reste
// de l'algorithme. Comme ça, le prix utilisé pour construire la liste
// (budget, tri, sélection) et celui affiché ensuite sont TOUJOURS le même
// nombre : pas de décalage possible entre "ce qui a été compté dans le
// budget" et "ce qui s'affiche à l'écran". Si aucune préférence n'est
// définie, ou si le catalogue n'a rien pour cette enseigne, comportement
// strictement inchangé (repli sur price/priceInfo par défaut).
function resolveEffectivePriceInfo(
  product: Product,
  preferences: UserPreferences
): { price: number; priceInfo: PriceInfo | undefined } {
  const fallback = { price: product.price, priceInfo: product.priceInfo };
  if (!preferences.preferredEnseigne) return fallback;

  const observations = product.priceObservations ?? [];
  const hasAmount = (o: PriceInfo): o is PriceInfo & { amount: number } =>
    typeof o.amount === "number";

  const exactZoneMatch = observations.find(
    (o) =>
      o.enseigne === preferences.preferredEnseigne &&
      preferences.preferredZone !== null &&
      o.zone === preferences.preferredZone &&
      hasAmount(o)
  );
  if (exactZoneMatch) {
    return { price: exactZoneMatch.amount as number, priceInfo: exactZoneMatch };
  }

  // Pas de relevé dans cette ville précise : la même enseigne ailleurs reste
  // plus pertinent que le prix générique par défaut.
  const sameEnseigne = observations.find(
    (o) => o.enseigne === preferences.preferredEnseigne && hasAmount(o)
  );
  if (sameEnseigne) {
    return { price: sameEnseigne.amount as number, priceInfo: sameEnseigne };
  }

  return fallback;
}

function filterProducts(preferences: UserPreferences): Product[] {
  return products
    .filter(
      (product) =>
        matchesDiet(product, preferences.diet) &&
        matchesAllergies(product, preferences.allergies) &&
        // Mode Performance : uniquement des produits bruts/peu transformés —
        // exclusion pure, pas juste une préférence de score, comme demandé.
        (!preferences.performanceMode || !product.ultraTransforme)
    )
    .map((product) => {
      const { price, priceInfo } = resolveEffectivePriceInfo(product, preferences);
      if (price === product.price && priceInfo === product.priceInfo) return product;
      return { ...product, price, priceInfo };
    });
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

  // Petit-déjeuner Mode Performance : flocons d'avoine + fromage blanc
  // plutôt que pain/confiture — retour utilisateur (8 août 2026), plus
  // rassasiant et protéiné pour qui s'entraîne. Ciblé sur ces deux produits
  // précis (pas une règle générale "jamais de pain") : le reste du
  // catalogue ne distingue pas glucides complexes/raffinés, donc pas de
  // base fiable pour généraliser au-delà de ce retour concret.
  if (
    preferences.performanceMode &&
    (product.id === "flocons-avoine" || product.id === "fromage-blanc")
  ) {
    s += 3;
  }

  // Objectif calorique réellement visé par les courses — réduit si la
  // personne mange à la cantine le midi (voir lib/macros.ts), pour ne pas
  // prévoir/acheter de la nourriture pour un repas pris à l'extérieur.
  const effectiveDailyCalories = getEffectiveDailyCalories(
    preferences,
    preferences.dailyCalories
  );

  if (effectiveDailyCalories !== null) {
    if (effectiveDailyCalories >= 2400 && product.kcal >= 250) s += 1;
    if (effectiveDailyCalories <= 1800 && product.kcal <= 150) s += 1;
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
    (effectiveDailyCalories !== null && effectiveDailyCalories >= 2400);
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

  // Pénalité pour les produits quasi sans calories (eau, sodas light...) —
  // sans ça, leur prix ridicule (souvent < 1€) les faisait remonter en tête
  // du remplissage glouton de la phase 2 sur les petits budgets, où l'argent
  // est justement le plus précieux et devrait aller à de la vraie nourriture.
  if (product.kcal < 20) {
    s -= 5;
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
// augmente plutôt la quantité d'un produit déjà choisi — sans plafond du
// tout, un gros budget finissait avec 8-10 légumes ou viandes/poissons
// différents en une seule petite portion chacun, plus dur à cuisiner.
// Plafonds relevés le 8 août 2026 (retour utilisateur : repas trop
// répétitifs, déjeuner identique au dîner) — generateMenu.ts répartit
// maintenant chaque produit sur des CRÉNEAUX précis plutôt que des jours
// entiers, donc plus il y a de produits différents dans ces catégories,
// plus le déjeuner peut réellement différer du dîner et les jours entre
// eux. Boulangerie reste à 3 : les petits-déjeuners sont déjà couverts par
// la rotation des familles de pains/laitages, une variété plus large n'y
// change pas grand-chose.
const MAX_DISTINCT_PER_CATEGORY: Partial<Record<Product["category"], number>> = {
  epicerie: 5,
  "fruits-legumes": 5,
  frais: 4,
  boulangerie: 3,
  "viande-poisson": 4,
};

// Au-delà de ce budget, le plafond de variété ci-dessus augmente plutôt que
// de rester fixe — retour utilisateur (8 août 2026) : avec peu de budget,
// des repas qui se ressemblent est normal et acceptable, mais avec un gros
// budget et de la marge, rien ne justifie de se limiter à si peu de produits
// différents. Chaque tranche de VARIETY_BUDGET_STEP € au-dessus du seuil
// débloque un produit distinct de plus par catégorie, jusqu'à
// VARIETY_MAX_BONUS. Boulangerie n'en profite pas : le petit-déjeuner est
// déjà couvert par la rotation des familles de pains (voir
// generateMenu.ts), plus de variété n'y change pas grand-chose.
const VARIETY_BUDGET_THRESHOLD = 80;
const VARIETY_BUDGET_STEP = 20;
const VARIETY_MAX_BONUS = 3;

function distinctCapFor(
  category: Product["category"],
  budget: number
): number | undefined {
  const base = MAX_DISTINCT_PER_CATEGORY[category];
  if (base === undefined || category === "boulangerie") return base;
  if (budget < VARIETY_BUDGET_THRESHOLD) return base;
  const bonus = Math.min(
    VARIETY_MAX_BONUS,
    1 + Math.floor((budget - VARIETY_BUDGET_THRESHOLD) / VARIETY_BUDGET_STEP)
  );
  return base + bonus;
}

const DEFAULT_MAX_QUANTITY_PER_ITEM = 3;
// La boulangerie ne profite pas du "boost" de quantité : comme le pain se
// répartit ensuite sur ses quelques jours réservés (voir generateMenu.ts,
// familles de produits), booster la quantité d'une baguette ou d'une
// viennoiserie concentre une portion énorme (ex : 3 portions de chaussons
// aux pommes) sur un seul jour au lieu d'agrandir un vrai repas. Pour du
// pain/des viennoiseries en plus, mieux vaut varier (plus de produits
// distincts, déjà plafonné juste au-dessus) que dupliquer le même.
const MAX_QUANTITY_PER_ITEM: Partial<Record<Product["category"], number>> = {
  boulangerie: 1,
};

function maxQuantityFor(category: Product["category"]): number {
  return MAX_QUANTITY_PER_ITEM[category] ?? DEFAULT_MAX_QUANTITY_PER_ITEM;
}

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
  // "Réel" veut aussi dire "a un minimum de calories" — sans ce seuil, une
  // eau gazeuse (0 kcal, quasi gratuite) pouvait remplir la case "collation"
  // à elle seule sur un petit budget, alors qu'elle ne nourrit personne :
  // le budget filait dans une bouteille d'eau plutôt qu'un vrai encas.
  const MIN_REAL_MEAL_KCAL = 20;
  const isGourmand = preferences.macroPreferences.includes("gourmand");
  for (const slot of MEAL_SLOT_ORDER) {
    const alreadyCovered = selected.some(
      (p) =>
        p.mealSlot === slot &&
        p.weeklyServings &&
        !p.isCondiment &&
        p.kcal >= MIN_REAL_MEAL_KCAL
    );
    if (alreadyCovered) continue;

    const candidates = filtered
      .filter(
        (p) =>
          p.mealSlot === slot &&
          p.weeklyServings &&
          !p.isCondiment &&
          p.kcal >= MIN_REAL_MEAL_KCAL &&
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

  // Phase 1c : si du pain/une baguette a été retenu pour le petit-déjeuner,
  // s'assurer qu'il y a bien de quoi le tartiner (confiture, beurre, miel,
  // pâte à tartiner, beurre de cacahuète...) — sans ça, le petit-déjeuner se
  // résumait à du pain nu avec du lait, ce qui n'a pas grand intérêt.
  const hasBreadForBreakfast = selected.some(
    (p) => p.category === "boulangerie" && p.mealSlot === "petit-dejeuner"
  );
  const hasSpread = selected.some((p) => p.isSpread);
  if (hasBreadForBreakfast && !hasSpread) {
    const spreadCandidates = filtered
      .filter((p) => p.isSpread && !selectedIds.has(p.id))
      .sort((a, b) => {
        const scoreDiff = score(b, preferences) - score(a, preferences);
        if (scoreDiff !== 0) return scoreDiff;
        return a.price - b.price;
      });

    const spread = spreadCandidates[0];
    if (spread && total + spread.price <= preferences.budget) {
      selected.push(spread);
      selectedIds.add(spread.id);
      quantities.set(spread.id, 1);
      total += spread.price;
    }
  }

  // Phase 1d : s'assurer qu'il y a un féculent (riz, pâtes, pommes de
  // terre...) pour le déjeuner/dîner. Sans ça, "un vrai repas par créneau"
  // pouvait être satisfait par un simple pois chiches + fromage + concombre
  // — nutritionnellement correct, mais ça ressemble plus à une salade froide
  // qu'à un vrai plat cuisiné avec une base.
  const hasFeculent = selected.some((p) => FECULENT_IDS.has(p.id));
  if (!hasFeculent) {
    const feculentCandidates = filtered
      .filter((p) => FECULENT_IDS.has(p.id) && !selectedIds.has(p.id))
      .sort((a, b) => {
        const scoreDiff = score(b, preferences) - score(a, preferences);
        if (scoreDiff !== 0) return scoreDiff;
        return a.price - b.price;
      });

    const feculent = feculentCandidates[0];
    if (feculent && total + feculent.price <= preferences.budget) {
      selected.push(feculent);
      selectedIds.add(feculent.id);
      quantities.set(feculent.id, 1);
      total += feculent.price;
    }
  }

  // Phase 1e (Mode Performance) : double la quantité achetée de la
  // protéine principale et du féculent du déjeuner/dîner, ainsi que du
  // fromage blanc/des flocons d'avoine du petit-déjeuner — retour
  // utilisateur (8 août 2026) : "85 g de poulet, 80 g de pommes de terre,
  // 25 g de lentilles, 55 g de fromage blanc, je trouve ça pas assez, je
  // mange des escalopes de 150-200 g". La quantité hebdomadaire de ces
  // produits est ensuite répartie sur plusieurs créneaux/jours (voir
  // generateMenu.ts) : la doubler ici double d'autant la portion réellement
  // servie chaque jour. Volontairement limité à la protéine/au féculent
  // "principaux" du repas (pas tout produit riche en protéines, comme le
  // parmesan ou les pois chiches en accompagnement) : booster indistinctement
  // tout épuiserait le budget avant même la phase 2, au détriment de la
  // variété. Seulement si le budget le permet — sinon on garde discrètement
  // la quantité normale plutôt que de dépasser le budget saisi (voir aussi
  // le message "budget insuffisant" si le Mode Performance a besoin d'un
  // budget plus large que prévu).
  const PERFORMANCE_PORTION_MULTIPLIER = 2;
  if (preferences.performanceMode) {
    const boostTargets = selected.filter(
      (p) =>
        (p.mealSlot === "dejeuner-diner" &&
          // Lentilles citées explicitement dans le retour utilisateur : pas
          // dans FECULENT_IDS (légumineuse, pas un féculent pur), mais joue
          // le même rôle de "base du repas" que le riz ou les pâtes.
          (p.category === "viande-poisson" ||
            FECULENT_IDS.has(p.id) ||
            p.id === "lentilles")) ||
        (p.mealSlot === "petit-dejeuner" &&
          (p.id === "fromage-blanc" || p.id === "flocons-avoine"))
    );
    for (const product of boostTargets) {
      const currentQty = quantities.get(product.id) ?? 1;
      const targetQty = Math.min(
        currentQty * PERFORMANCE_PORTION_MULTIPLIER,
        maxQuantityFor(product.category)
      );
      const extraCost = (targetQty - currentQty) * product.price;
      if (targetQty > currentQty && total + extraCost <= preferences.budget) {
        quantities.set(product.id, targetQty);
        total += extraCost;
      }
    }
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
    const cap = distinctCapFor(product.category, preferences.budget);
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
            (quantities.get(p.id) ?? 1) < maxQuantityFor(p.category)
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

  // Cantine le midi certains jours de la semaine (variable d'une personne à
  // l'autre, voir preferences.canteenDays) : sur les 14 repas "déjeuner-dîner"
  // de la semaine (7 jours x 2), chaque jour cantine retire un déjeuner à
  // prévoir à la maison. On réduit d'autant les quantités déjà choisies dans
  // cette catégorie plutôt que d'acheter pour des déjeuners qui ne seront
  // jamais mangés à la maison — sinon ça finit en restes non consommés. Le
  // budget libéré est réinvesti ailleurs (davantage de variété dans le reste
  // de la liste) plutôt que perdu.
  if (preferences.canteenDays.length > 0) {
    const TOTAL_LUNCH_DINNER_SLOTS = 14;
    const NEEDED_FRACTION =
      (TOTAL_LUNCH_DINNER_SLOTS - preferences.canteenDays.length) /
      TOTAL_LUNCH_DINNER_SLOTS;
    let freedBudget = 0;

    for (const product of selected) {
      if (product.mealSlot !== "dejeuner-diner") continue;
      const currentQty = quantities.get(product.id) ?? 1;
      const newQty = Math.max(1, Math.round(currentQty * NEEDED_FRACTION));
      if (newQty < currentQty) {
        freedBudget += (currentQty - newQty) * product.price;
        quantities.set(product.id, newQty);
        total -= (currentQty - newQty) * product.price;
      }
    }

    if (freedBudget > 0) {
      const extraCandidates = filtered
        .filter((p) => !selectedIds.has(p.id))
        .sort((a, b) => {
          const scoreDiff = score(b, preferences) - score(a, preferences);
          if (scoreDiff !== 0) return scoreDiff;
          return a.price - b.price;
        });

      for (const product of extraCandidates) {
        const cap = distinctCapFor(product.category, preferences.budget);
        const atCap =
          cap !== undefined && (categoryCounts.get(product.category) ?? 0) >= cap;
        if (atCap) continue;

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
    }
  }

  // Marge restante : s'il reste un vrai reliquat de budget une fois tout le
  // nécessaire couvert, on l'utilise pour ajouter d'autres produits
  // distincts plutôt que de le laisser inutilisé — retour utilisateur : "je
  // ne vois pas le problème à avoir plus de diversité" quand il reste de
  // l'argent. Ignore volontairement le plafond de variété par catégorie
  // (déjà relevé pour les gros budgets ci-dessus, mais ici on va plus loin :
  // n'importe quel reliquat sert à varier plutôt qu'à dormir dans le
  // budget). Plafonné en nombre d'articles pour ne pas non plus finir avec
  // une multitude de produits en une seule petite portion chacun.
  const LEFTOVER_VARIETY_THRESHOLD = 3;
  const MAX_LEFTOVER_VARIETY_ITEMS = 4;
  if (preferences.budget - total >= LEFTOVER_VARIETY_THRESHOLD) {
    const leftoverCandidates = filtered
      .filter((p) => !selectedIds.has(p.id))
      .sort((a, b) => {
        const scoreDiff = score(b, preferences) - score(a, preferences);
        if (scoreDiff !== 0) return scoreDiff;
        return a.price - b.price;
      });

    let leftoverAdded = 0;
    for (const product of leftoverCandidates) {
      if (leftoverAdded >= MAX_LEFTOVER_VARIETY_ITEMS) break;
      if (total + product.price > preferences.budget) continue;

      selected.push(product);
      selectedIds.add(product.id);
      quantities.set(product.id, 1);
      total += product.price;
      leftoverAdded += 1;
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

// Rang numérique d'un niveau nutritionnel — sert uniquement à mesurer un
// écart ("faible" à "riche" = 2 crans) dans findSubstitute ci-dessous, pas à
// autre chose.
const LEVEL_RANK: Record<Product["protein"], number> = {
  faible: 0,
  moyen: 1,
  riche: 2,
};

// Nombre d'options de remplacement proposées pour un même article — retour
// utilisateur (8 août 2026) : "je peux juste le changer une fois, si je
// n'aime pas la première option je suis obligé d'accepter la deuxième, je
// voudrais au moins quatre options".
const SUBSTITUTE_OPTIONS_COUNT = 4;

// Trouve jusqu'à SUBSTITUTE_OPTIONS_COUNT produits de remplacement pour un
// article de la liste, classés du plus proche au moins proche — pouvoir
// choisir parmi plusieurs équivalents (ex : les lentilles) plutôt que
// d'accepter le seul remplaçant proposé. Toujours dans la même catégorie ET
// le même créneau de repas que l'original, pour rester cohérent avec "Mon
// menu" (jamais un produit de petit-déjeuner en remplacement d'un dîner).
// Respecte toujours le régime et les allergies déjà filtrés par
// filterProducts — un remplacement ne doit jamais réintroduire un allergène
// écarté ailleurs dans l'application.
export function findSubstitutes(
  product: Product,
  preferences: UserPreferences,
  excludeIds: Set<string>
): Product[] {
  const candidates = filterProducts(preferences).filter(
    (p) =>
      p.id !== product.id &&
      !excludeIds.has(p.id) &&
      p.category === product.category &&
      p.mealSlot === product.mealSlot &&
      // Même "rôle" dans le repas, pas seulement même catégorie/créneau —
      // sans ça, une confiture (condiment à tartiner) pouvait être
      // "remplacée" par un jus de fruits : même catégorie/créneau, niveaux
      // nutritionnels proches par coïncidence, mais un rôle complètement
      // différent dans le petit-déjeuner.
      Boolean(p.isCondiment) === Boolean(product.isCondiment) &&
      Boolean(p.isSpread) === Boolean(product.isSpread)
  );

  if (candidates.length === 0) return [];

  // Le prix pèse le plus lourd : l'objectif principal du retour utilisateur
  // est "qui ne va pas changer le budget", la proximité nutritionnelle
  // vient en second. kcal et prix sont normalisés en écart relatif (%) pour
  // rester comparables aux écarts de niveau (0, 1 ou 2 crans).
  //
  // Quand les DEUX produits ont de vraies valeurs nutritionnelles (voir
  // scripts/fetch-nutrition.mjs), l'écart en grammes (relatif) remplace
  // l'écart de niveau qualitatif — bien plus précis pour distinguer deux
  // produits qui seraient tous les deux "riche en protéines" par exemple.
  // Dès qu'un seul des deux n'a pas cette donnée, on retombe sur les
  // niveaux qualitatifs pour rester comparable.
  function distance(candidate: Product): number {
    const bothHaveRealNutrition = Boolean(
      candidate.nutritionPer100g &&
        product.nutritionPer100g &&
        candidate.nutritionPer100g.proteinG != null &&
        candidate.nutritionPer100g.lipidesG != null &&
        candidate.nutritionPer100g.glucidesG != null &&
        product.nutritionPer100g.proteinG != null &&
        product.nutritionPer100g.lipidesG != null &&
        product.nutritionPer100g.glucidesG != null
    );

    let proteinDiff: number;
    let lipidesDiff: number;
    let glucidesDiff: number;

    if (bothHaveRealNutrition) {
      const a = candidate.nutritionPer100g!;
      const b = product.nutritionPer100g!;
      proteinDiff = Math.abs(a.proteinG! - b.proteinG!) / Math.max(b.proteinG!, 1);
      lipidesDiff = Math.abs(a.lipidesG! - b.lipidesG!) / Math.max(b.lipidesG!, 1);
      glucidesDiff = Math.abs(a.glucidesG! - b.glucidesG!) / Math.max(b.glucidesG!, 1);
    } else {
      proteinDiff = Math.abs(
        LEVEL_RANK[candidate.protein] - LEVEL_RANK[product.protein]
      );
      lipidesDiff = Math.abs(
        LEVEL_RANK[candidate.lipides] - LEVEL_RANK[product.lipides]
      );
      glucidesDiff = Math.abs(
        LEVEL_RANK[candidate.glucides] - LEVEL_RANK[product.glucides]
      );
    }

    const kcalDiff = Math.abs(candidate.kcal - product.kcal) / Math.max(product.kcal, 1);
    const priceDiff =
      Math.abs(candidate.price - product.price) / Math.max(product.price, 0.01);

    return (
      proteinDiff * 2 + lipidesDiff + glucidesDiff + kcalDiff * 2 + priceDiff * 4
    );
  }

  return [...candidates]
    .sort((a, b) => distance(a) - distance(b))
    .slice(0, SUBSTITUTE_OPTIONS_COUNT);
}

// Recalcule les totaux d'une liste après un échange de produit (voir
// findSubstitutes) — le budget, le coût plancher et le "budget insuffisant"
// ne dépendent pas d'un échange dans une même catégorie/créneau, seul le
// total change.
export function recomputeAfterSwap(
  items: ShoppingListItem[],
  previous: ShoppingListResult
): ShoppingListResult {
  const total = round(
    items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );
  return {
    ...previous,
    items,
    total,
    remaining: round(Math.max(0, previous.budget - total)),
    isOverBudget: total > previous.budget,
  };
}

// Remplace un article de la liste par un autre produit, en conservant la
// même quantité achetée (voir ResultsContent.tsx, bouton "Échanger").
export function replaceItem(
  items: ShoppingListItem[],
  oldProductId: string,
  newProduct: Product
): ShoppingListItem[] {
  return items.map((item) =>
    item.product.id === oldProductId ? { ...item, product: newProduct } : item
  );
}

// Ré-applique les échanges de produits mémorisés sur le compte (voir
// UserProfile.productSubstitutions, ResultsContent.tsx) à une liste tout
// juste générée — pour que "reconnecte-toi et retombe sur ta liste" (voir
// CampusPanierApp.tsx) retrouve aussi les échanges faits la dernière fois,
// pas seulement le budget. Toujours revalidé contre le régime/les
// allergies ACTUELS via filterProducts : un échange qui ne conviendrait
// plus (ex: régime changé depuis, ou produit retiré du catalogue) est
// simplement ignoré plutôt que réappliqué à l'aveugle — la liste fraîche
// reste donc toujours sûre même si la mémorisation est périmée.
export function applyStoredSubstitutions(
  items: ShoppingListItem[],
  substitutions: Record<string, string> | null,
  preferences: UserPreferences
): ShoppingListItem[] {
  if (!substitutions) return items;
  const entries = Object.entries(substitutions);
  if (entries.length === 0) return items;

  const catalogById = new Map(filterProducts(preferences).map((p) => [p.id, p]));
  const presentIds = new Set(items.map((item) => item.product.id));
  let result = items;

  for (const [oldId, newId] of entries) {
    if (!presentIds.has(oldId) || presentIds.has(newId)) continue;
    const newProduct = catalogById.get(newId);
    if (!newProduct) continue;

    result = replaceItem(result, oldId, newProduct);
    presentIds.delete(oldId);
    presentIds.add(newId);
  }

  return result;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// Règle produit non négociable : on n'appelle jamais un prix "relevé" s'il
// manque l'enseigne, la ville OU la date — les trois doivent être connues à
// la fois, sinon c'est une estimation, point final. Ça inclut les 93 prix
// "open-prices" historiques importés avant la mise en place de ce suivi
// (détail non conservé à l'époque) : ils basculent automatiquement en
// "estimation" ci-dessous plutôt que d'être présentés comme fiables.
const FRESH_PRICE_MAX_AGE_DAYS = 90;

export type PriceReliability = "fresh" | "old" | "estimation";

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

// Trois états possibles, jamais plus — voir le principe ci-dessus. "fresh"
// et "old" exigent tous les trois enseigne+zone+date ; sans ça, ou si le
// produit n'a pas du tout de priceInfo, c'est une estimation.
export function getPriceReliability(priceInfo: PriceInfo | undefined): PriceReliability {
  if (!priceInfo || priceInfo.source !== "open-prices") return "estimation";
  if (!priceInfo.enseigne || !priceInfo.zone || !priceInfo.date) return "estimation";
  return daysSince(priceInfo.date) > FRESH_PRICE_MAX_AGE_DAYS ? "old" : "fresh";
}

// Une seule ligne, honnête, sous chaque produit dans "Ma liste" — jamais un
// écran séparé ni de jargon. Trois formulations possibles seulement :
// "Relevé : Carrefour, Lyon · 12 août", "Relevé ancien : ..." au-delà de
// FRESH_PRICE_MAX_AGE_DAYS, ou simplement "Estimation".
export function formatPriceProvenance(priceInfo: PriceInfo | undefined): string {
  const reliability = getPriceReliability(priceInfo);
  if (reliability === "estimation") return "Estimation";

  const date = new Date(priceInfo!.date!).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  const label = reliability === "fresh" ? "Relevé" : "Relevé ancien";
  return `${label} : ${priceInfo!.enseigne}, ${priceInfo!.zone} · ${date}`;
}

export { products };
