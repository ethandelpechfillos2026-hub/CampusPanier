export type DietType = "omnivore" | "vegetarien" | "vegan" | "sans-porc";

// Les 14 allergènes à déclaration obligatoire au sens du règlement européen
// INCO (UE) n°1169/2011 — la liste de référence utilisée sur tous les
// emballages alimentaires en France. Étendue le 8 août 2026 (retour
// utilisateur : "il n'y a pas que 5 allergies") depuis une première liste de
// 5 qui ne couvrait que les cas les plus fréquents.
export type Allergen =
  | "gluten"
  | "lactose"
  | "oeuf"
  | "arachide"
  | "fruits-a-coque"
  | "soja"
  | "poisson"
  | "crustaces"
  | "mollusques"
  | "celeri"
  | "moutarde"
  | "sesame"
  | "sulfites"
  | "lupin";

export type ProductCategory =
  | "epicerie"
  | "fruits-legumes"
  | "frais"
  | "boulangerie"
  | "viande-poisson";

export type NutriLevel = "faible" | "moyen" | "riche";

export type MealSlot = "petit-dejeuner" | "dejeuner-diner" | "encas-extra";

export type MacroPreference =
  | "riche-proteines"
  | "faible-lipides"
  | "riche-glucides"
  | "faible-sel"
  | "faible-sucre"
  | "riche-fibres"
  | "facile"
  | "prise-masse"
  | "seche"
  | "belle-peau"
  | "gourmand";

// Provenance et fiabilité du prix d'un produit — sépare explicitement "on a
// un vrai prix observé, avec son enseigne/sa ville/sa date" de "on n'a
// qu'une estimation moyenne par rayon", pour pouvoir l'afficher honnêtement
// plutôt que de montrer un simple nombre sans contexte (voir
// scripts/build-catalog.mjs pour comment ce champ est rempli).
export interface PriceInfo {
  source: "open-prices" | "estimation";
  // Prix en euros de CE relevé précis — absent pour une estimation générique
  // (dans ce cas, seul Product.price fait foi).
  amount?: number;
  // Date ISO (YYYY-MM-DD) du relevé — absente si l'estimation est générique,
  // ou si le prix vient d'un relevé Open Prices importé avant la mise en
  // place de ce suivi (détail non conservé à l'époque).
  date?: string;
  // Enseigne du relevé (ex: "Carrefour", "Lidl") — seulement si Open Prices
  // la connaît pour ce relevé précis.
  enseigne?: string;
  // Ville du relevé — seulement si Open Prices la connaît.
  zone?: string;
}

// Vraies valeurs nutritionnelles pour 100 g, sourcées depuis Open Food
// Facts (voir scripts/fetch-nutrition.mjs) — jamais inventées. Les niveaux
// qualitatifs (NutriLevel) restent le filet de sécurité pour tout produit
// qui n'a pas encore cette donnée précise.
// Traçabilité obligatoire : jamais de valeur inventée. Priorité de
// sourcing : 1) Open Food Facts via code-barres exact, 2) Ciqual 2025
// (Anses) par correspondance d'aliment générique, 3) étiquette fabricant
// enregistrée, 4) aucune valeur si rien de fiable — voir
// scripts/fetch-nutrition.mjs et le rapport de sourcing dans
// PLAN-DONNEES-PRIX-CATALOGUE.md.
export interface NutritionFacts {
  per100g: true;
  kcal: number | null;
  proteinG: number | null;
  glucidesG: number | null;
  sucresG: number | null;
  lipidesG: number | null;
  satureesG: number | null;
  fibresG: number | null;
  selG: number | null;
  nutritionSource: "open-food-facts" | "ciqual-2025" | "manufacturer" | "unknown";
  // Nom exact de l'aliment/produit dans la source (utile pour vérifier une
  // correspondance a posteriori).
  sourceFoodName: string | null;
  // Code-barres OFF ou code alim_code Ciqual selon la source.
  sourceId: string | null;
  matchConfidence: "exact" | "high" | "review" | "unknown";
  sourceVersion: string | null;
  importDate: string | null;
  // Précision affichée à l'écran quand la correspondance est une
  // approximation (ex: "plat complet riz + sauce, valeur = poisson en
  // sauce seul") — pour que la personne comprenne ce que représente le
  // chiffre plutôt que de le prendre pour une mesure exacte du produit.
  sourceNote?: string;
}

export interface Product {
  id: string;
  name: string;
  // Nom court utilisé dans le planning jour par jour (ex: "Baguette
  // viennoise" plutôt que "4 Baguettes viennoises 340g"). Optionnel — si
  // absent, on retombe sur `name`.
  shortName?: string;
  price: number;
  // Provenance/fiabilité de `price` ci-dessus — voir PriceInfo. Absent pour
  // les tout premiers produits du catalogue construits avant ce suivi.
  priceInfo?: PriceInfo;
  // Autres relevés Open Prices connus pour ce produit, un par enseigne
  // distincte (le plus récent de chaque) — sert à proposer un prix plus
  // pertinent quand la personne a choisi une enseigne préférée dans son
  // profil (voir getEffectivePriceInfo dans lib/generateShoppingList.ts).
  // `priceInfo` ci-dessus reste le relevé par défaut utilisé quand aucune
  // préférence d'enseigne ne correspond. Peut être absent ou vide : rien ne
  // change alors par rapport au comportement par défaut.
  priceObservations?: PriceInfo[];
  // Code-barres Open Food Facts d'origine — conservé pour pouvoir rafraîchir
  // le prix plus tard (scripts/build-catalog.mjs) sans redemander une
  // recherche complète à OFF, qui pourrait retomber sur une fiche différente.
  offCode?: string;
  unit: string;
  category: ProductCategory;
  dietTags: DietType[];
  allergens: Allergen[];
  kcal: number;
  protein: NutriLevel;
  lipides: NutriLevel;
  glucides: NutriLevel;
  sel: NutriLevel;
  easyToCook: boolean;
  mealSlot: MealSlot;
  // Combien d'unités "consommables" contient un seul achat de ce produit,
  // et comment on les nomme (ex: 10 œufs, 4 yaourts). Absent pour les
  // produits qui se dosent librement selon la recette (huile, pâtes,
  // riz sec...) — dans ce cas pas de répartition journalière affichée.
  weeklyServings?: number;
  servingUnit?: string;
  // Quand l'unité seule ne parle pas (ex: "portion" de lentilles ou de
  // pâtes), on précise le poids en grammes d'une portion — le planning
  // affiche alors directement "160 g" plutôt que "2 portions".
  gramsPerServing?: number;
  // Produit "plaisir" (sucré, gras, gourmand) plutôt qu'équilibré — sert à la
  // préférence "Gourmand", pour se faire plaisir même avec un petit budget.
  gourmand?: boolean;
  // Condiment/assaisonnement (huile, sucre, moutarde...) qui n'est jamais
  // mangé seul comme un repas — reste dans "Ma liste" mais n'apparaît pas
  // comme ligne indépendante dans le planning jour par jour ("Mon menu"),
  // pour éviter des suggestions incohérentes type "1 cuillère de sucre" à
  // manger seule au petit-déjeuner.
  isCondiment?: boolean;
  // Produit industriel/reconstitué avec de nombreux additifs (viennoiserie
  // emballée, charcuterie, plat préparé, soda, bonbon...) plutôt que brut ou
  // peu transformé — sert au "Mode Performance", qui exclut ces produits
  // pour ne proposer que des aliments bruts. Absent = considéré comme non
  // ultra-transformé.
  ultraTransforme?: boolean;
  // Pâte à tartiner/beurre/confiture/miel — un condiment, mais spécifiquement
  // le genre qu'on met SUR du pain au petit-déjeuner. Sert à garantir qu'un
  // pain/baguette acheté ait toujours de quoi être tartiné (voir
  // generateShoppingList.ts), sans quoi le petit-déjeuner se résumait à du
  // pain nu — pas très appétissant.
  isSpread?: boolean;
  // Voir NutritionFacts ci-dessus — absent tant que Open Food Facts n'a pas
  // été interrogé (ou n'a rien de fiable) pour ce produit précis. Quand
  // présent, l'app l'utilise à la place des niveaux qualitatifs (popup
  // nutrition, échange de produit) ; absent = comportement inchangé.
  nutritionPer100g?: NutritionFacts;
}

export type Sex = "homme" | "femme";

// Objectifs en grammes fixés à la main par la personne (sportif·ves,
// pratiques avisé·es...) plutôt que calculés automatiquement à partir du
// profil corporel — remplace le calcul par défaut de lib/macros.ts quand
// présent.
export interface MacroOverride {
  proteinG: number;
  lipidesG: number;
  glucidesG: number;
}

// Utilisés pour calculer (ou ajuster à la main) un repère personnalisé de
// grammes de protéines/lipides/glucides par jour (voir lib/macros.ts).
export interface BodyStats {
  sex: Sex | null;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  macroOverride: MacroOverride | null;
  // "Mode Performance" (sportif·ves) : calories obligatoires, objectif
  // prise de masse/sèche + belle peau ajoutés automatiquement aux
  // préférences, et seuls les produits bruts/peu transformés sont proposés
  // (voir Product.ultraTransforme).
  performanceMode: boolean;
  // Jours (0 = lundi ... 4 = vendredi) où la personne mange à la cantine le
  // midi — tout le monde n'y va pas les mêmes jours (ex : pas le mercredi).
  // Tableau vide = jamais à la cantine. Pour ces jours-là, on réduit
  // d'autant les quantités de féculent/légume/protéine "déjeuner-dîner"
  // prévues pour la maison (voir generateShoppingList.ts et
  // generateMenu.ts), et "Mon menu" met tout au dîner ce jour-là au lieu de
  // partager entre midi et soir — sinon la part "midi" achetée n'est jamais
  // consommée et finit en restes.
  canteenDays: number[];
  // Enseigne où la personne fait plutôt ses courses (ex: "Lidl") — optionnel
  // ("peu importe" = null). Sert à préférer, quand elle existe, une donnée
  // de Product.priceObservations relevée dans CETTE enseigne plutôt que le
  // prix par défaut du catalogue (voir getEffectivePriceInfo dans
  // lib/generateShoppingList.ts). N'a un effet visible que si le catalogue
  // a effectivement un relevé pour cette enseigne — sinon, comportement
  // inchangé.
  preferredEnseigne: string | null;
  // Ville où la personne fait ses courses — optionnelle, affinage en plus
  // de l'enseigne (les deux doivent correspondre pour un match "exact").
  preferredZone: string | null;
}

// Enseignes proposées dans le profil — grandes surfaces généralistes les
// plus courantes en France. Liste volontairement courte (pas 30 enseignes)
// pour rester simple ; une personne dont l'enseigne n'y est pas peut laisser
// "Peu importe".
export const ENSEIGNE_OPTIONS = [
  "Lidl",
  "Carrefour",
  "E.Leclerc",
  "Auchan",
  "Intermarché",
  "Système U",
  "Casino",
  "Aldi",
  "Monoprix",
] as const;

// Un repas mangé "dehors" de façon imprévue (ex : pizza avec des ami·es), à
// la différence de la cantine qui est régulière et connue à l'avance. Loggé
// à la volée dans "Mon menu" (pas dans le profil) pour : (1) ne pas perdre
// les ingrédients déjà achetés pour ce repas — regroupés en "bonus" plutôt
// qu'assignés arbitrairement à un autre jour déjà complet (voir
// generateMenu.ts) — et (2) réajuster l'objectif calorique du reste de la
// semaine (voir lib/macros.ts).
export interface MealOutEntry {
  dayIndex: number; // 0 (lundi) à 6 (dimanche)
  slot: "dejeuner" | "diner";
  estimatedKcal: number;
}

// Estimations rapides à choisir plutôt que de faire deviner un chiffre
// précis à la personne — elle ne connaît de toute façon pas les calories
// exactes d'un repas pris dehors.
export const MEAL_OUT_PRESETS: { label: string; kcal: number }[] = [
  { label: "Léger", kcal: 500 },
  { label: "Repas normal", kcal: 700 },
  { label: "Copieux (fast-food, pizza...)", kcal: 900 },
];

export interface UserProfile extends BodyStats {
  diet: DietType;
  allergies: Allergen[];
  dailyCalories: number | null;
  macroPreferences: MacroPreference[];
  // Consentement explicite RGPD (article 9) pour le traitement des données
  // de profil pouvant révéler des informations de santé ou alimentaires
  // (allergies, poids, taille, âge, objectifs caloriques, régime type
  // "sans porc"). Recueilli à l'étape 1 du formulaire de profil, avant toute
  // saisie de ces champs — voir components/ProfileForm.tsx. `false`/`null`
  // pour les comptes créés avant l'ajout de ce consentement (voir migration
  // défensive dans lib/authProfile.ts) : à traiter comme "consentement non
  // recueilli", pas comme un refus.
  healthConsent: boolean;
  healthConsentAt: string | null;
  // Budget de la dernière liste générée — sert uniquement à retomber
  // directement sur "Ma liste" à la prochaine connexion (avec ce même
  // compte Google, sur n'importe quel appareil) plutôt que sur l'écran
  // budget. Rattaché au profil Firestore (pas au localStorage de
  // l'appareil) : retour utilisateur — ce comportement doit suivre le
  // compte, pas l'appareil. `null` = jamais généré de liste, ou profil créé
  // avant l'ajout de ce champ (voir migration défensive dans
  // lib/authProfile.ts).
  lastBudget: number | null;
  // Échanges de produits mémorisés (voir ResultsContent.tsx, bouton
  // "Échanger") — clé : id du produit remplacé, valeur : id du produit
  // choisi à la place. Rattaché au compte (pas au localStorage) pour la
  // même raison que lastBudget : "je n'aime pas les lentilles" doit rester
  // vrai à la prochaine liste générée, sur n'importe quel appareil.
  // Toujours revalidé contre le régime/les allergies actuels avant d'être
  // réappliqué (voir applyStoredSubstitutions dans
  // lib/generateShoppingList.ts) — jamais réappliqué à l'aveugle. `null` =
  // aucun échange fait, ou profil créé avant l'ajout de ce champ.
  productSubstitutions: Record<string, string> | null;
}

export interface UserPreferences extends BodyStats {
  budget: number;
  diet: DietType;
  allergies: Allergen[];
  dailyCalories: number | null;
  macroPreferences: MacroPreference[];
}

export interface ShoppingListItem {
  product: Product;
  quantity: number;
}

export interface ShoppingListResult {
  items: ShoppingListItem[];
  total: number;
  budget: number;
  remaining: number;
  isOverBudget: boolean;
  minimalBalancedCost: number;
  isBudgetInsufficient: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  icon: string;
  prepTime: number;
  difficulty: "facile" | "moyen";
  ingredientIds: string[];
  steps: string[];
}

export interface RecipeMatch {
  recipe: Recipe;
  matchedCount: number;
  totalCount: number;
  missingProducts: Product[];
}

// Recette générée à la volée par l'IA (Groq) à partir des produits du
// panier — pas d'id fixe, pas d'ingredientIds à résoudre dans le
// catalogue, contrairement aux recettes statiques de data/recipes.json.
export interface GeneratedRecipe {
  name: string;
  icon: string;
  prepTime: number;
  difficulty: "facile" | "moyen";
  usedIngredients: string[];
  steps: string[];
}

export interface FavoriteList {
  id: string;
  label: string;
  preferences: UserPreferences;
  createdAt: number;
}

// Un article dans une liste partagée entre colocataires. Contrairement à
// ShoppingListItem (qui référence un Product complet, jamais persisté tel
// quel), on stocke ici une copie figée du nom/prix — comme pour
// ListHistoryItem — pour que la liste reste lisible même si le catalogue
// change plus tard.
export interface SharedListItem {
  name: string;
  price: number;
  checked: boolean;
  // Prénom (ou nom Google) de la personne qui a coché l'article, pour
  // l'attribution "coché par ..." affichée dans l'interface.
  checkedBy: string | null;
}

// Document Firestore de la collection "sharedLists". `items` est une map
// (product id -> SharedListItem) et non un tableau : ça permet des mises à
// jour partielles Firestore par chemin ("items.<id>.checked") qui touchent
// un seul champ sans relire/réécrire tout le document — indispensable pour
// éviter que deux colocataires qui cochent en même temps s'écrasent l'un
// l'autre.
export interface SharedList {
  id: string;
  ownerId: string;
  ownerName: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  inviteCode: string;
  budget: number;
  total: number;
  createdAt: number;
  items: Record<string, SharedListItem>;
  // Ordre d'affichage des articles (ids de produits), figé à la création à
  // partir de "Ma liste". Un TABLEAU, contrairement à `items` — Firestore ne
  // garantit pas l'ordre des champs d'une map à la lecture, alors qu'il
  // préserve toujours l'ordre d'un tableau. C'est ce champ qui sert à trier
  // l'affichage, pour que tous les colocataires voient les articles dans le
  // même ordre.
  itemOrder: string[];
}

export const BUDGET_MIN = 10;
export const BUDGET_MAX = 100;
export const BUDGET_DEFAULT = 25;
export const BUDGET_SHORTCUTS = [15, 25, 50, 80] as const;

export const CALORIE_MIN = 1500;
export const CALORIE_MAX = 3500;
export const CALORIE_DEFAULT = 2200;
export const CALORIE_STEP = 50;

export const WEIGHT_MIN = 40;
export const WEIGHT_MAX = 150;
export const WEIGHT_DEFAULT = 65;

export const HEIGHT_MIN = 140;
export const HEIGHT_MAX = 210;
export const HEIGHT_DEFAULT = 170;

export const AGE_MIN = 15;
export const AGE_MAX = 80;
export const AGE_DEFAULT = 20;

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
];

export const PROTEIN_G_MIN = 40;
export const PROTEIN_G_MAX = 250;
export const LIPIDES_G_MIN = 20;
export const LIPIDES_G_MAX = 150;
export const GLUCIDES_G_MIN = 50;
export const GLUCIDES_G_MAX = 500;

export const MACRO_OPTIONS: { value: MacroPreference; label: string }[] = [
  { value: "riche-proteines", label: "Riche en protéines" },
  { value: "faible-lipides", label: "Faible en lipides" },
  { value: "riche-glucides", label: "Riche en glucides" },
  { value: "faible-sel", label: "Faible en sel" },
  { value: "faible-sucre", label: "Faible en sucre" },
  { value: "riche-fibres", label: "Riche en fibres" },
  { value: "facile", label: "Recettes faciles" },
  { value: "prise-masse", label: "Prise de masse" },
  { value: "seche", label: "Sèche / cut" },
  { value: "belle-peau", label: "Belle peau" },
  { value: "gourmand", label: "Gourmand" },
];

export const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarien", label: "Végétarien" },
  { value: "vegan", label: "Végan" },
  { value: "sans-porc", label: "Sans porc" },
];

// Ordonnés du plus courant au plus rare, pour que la colonne de gauche
// (voir ProfileForm) regroupe les cas les plus fréquents.
export const ALLERGEN_OPTIONS: { value: Allergen; label: string }[] = [
  { value: "gluten", label: "Gluten" },
  { value: "lactose", label: "Lactose" },
  { value: "oeuf", label: "Œuf" },
  { value: "arachide", label: "Arachide" },
  { value: "fruits-a-coque", label: "Fruits à coque" },
  { value: "soja", label: "Soja" },
  { value: "poisson", label: "Poisson" },
  { value: "crustaces", label: "Crustacés" },
  { value: "mollusques", label: "Mollusques" },
  { value: "celeri", label: "Céleri" },
  { value: "moutarde", label: "Moutarde" },
  { value: "sesame", label: "Sésame" },
  { value: "sulfites", label: "Sulfites" },
  { value: "lupin", label: "Lupin" },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  epicerie: "Épicerie",
  "fruits-legumes": "Fruits et légumes",
  frais: "Frais",
  boulangerie: "Boulangerie",
  "viande-poisson": "Viande et poisson",
};

export const CATEGORY_ORDER: ProductCategory[] = [
  "epicerie",
  "fruits-legumes",
  "frais",
  "boulangerie",
  "viande-poisson",
];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  "petit-dejeuner": "Petit-déjeuner",
  "dejeuner-diner": "Déjeuner & Dîner",
  "encas-extra": "Encas & Extras",
};

export const MEAL_SLOT_ICONS: Record<MealSlot, string> = {
  "petit-dejeuner": "🌅",
  "dejeuner-diner": "🍽️",
  "encas-extra": "🍎",
};

export const MEAL_SLOT_ORDER: MealSlot[] = [
  "petit-dejeuner",
  "dejeuner-diner",
  "encas-extra",
];

export const STORAGE_KEY = "campus-panier-preferences";
