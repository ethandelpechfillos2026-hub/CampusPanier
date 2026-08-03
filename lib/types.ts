export type DietType = "omnivore" | "vegetarien" | "vegan" | "sans-porc";

export type Allergen =
  | "gluten"
  | "lactose"
  | "fruits-a-coque"
  | "oeuf"
  | "arachide";

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
  | "facile"
  | "prise-masse"
  | "seche"
  | "belle-peau"
  | "gourmand";

export interface Product {
  id: string;
  name: string;
  // Nom court utilisé dans le planning jour par jour (ex: "Baguette
  // viennoise" plutôt que "4 Baguettes viennoises 340g"). Optionnel — si
  // absent, on retombe sur `name`.
  shortName?: string;
  price: number;
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
  // Présent seulement sur les produits régénérés via scripts/build-catalog.mjs —
  // indique si le prix vient d'un vrai relevé Open Prices ou d'une estimation.
  priceSource?: "open-prices" | "estimation";
  // Produit "plaisir" (sucré, gras, gourmand) plutôt qu'équilibré — sert à la
  // préférence "Gourmand", pour se faire plaisir même avec un petit budget.
  gourmand?: boolean;
  // Condiment/assaisonnement (huile, sucre, moutarde...) qui n'est jamais
  // mangé seul comme un repas — reste dans "Ma liste" mais n'apparaît pas
  // comme ligne indépendante dans le planning jour par jour ("Mon menu"),
  // pour éviter des suggestions incohérentes type "1 cuillère de sucre" à
  // manger seule au petit-déjeuner.
  isCondiment?: boolean;
}

export type Sex = "homme" | "femme";

// Utilisés uniquement pour calculer un repère personnalisé de grammes de
// protéines/lipides/glucides par jour (voir lib/macros.ts) — jamais stockés
// ni affichés ailleurs que dans ce calcul.
export interface BodyStats {
  sex: Sex | null;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
}

export interface UserProfile extends BodyStats {
  diet: DietType;
  allergies: Allergen[];
  dailyCalories: number | null;
  macroPreferences: MacroPreference[];
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

export const MACRO_OPTIONS: { value: MacroPreference; label: string }[] = [
  { value: "riche-proteines", label: "Riche en protéines" },
  { value: "faible-lipides", label: "Faible en lipides" },
  { value: "riche-glucides", label: "Riche en glucides" },
  { value: "faible-sel", label: "Faible en sel" },
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

export const ALLERGEN_OPTIONS: { value: Allergen; label: string }[] = [
  { value: "gluten", label: "Gluten" },
  { value: "lactose", label: "Lactose" },
  { value: "fruits-a-coque", label: "Fruits à coque" },
  { value: "oeuf", label: "Œuf" },
  { value: "arachide", label: "Arachide" },
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
