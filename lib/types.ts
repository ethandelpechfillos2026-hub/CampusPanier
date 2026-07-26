export type DietType =
  | "omnivore"
  | "vegetarien"
  | "vegan"
  | "sans-porc"
  | "halal";

export type Allergen =
  | "gluten"
  | "lactose"
  | "fruits-a-coque"
  | "oeuf"
  | "soja"
  | "poisson"
  | "crustaces";

export type ProductCategory =
  | "feculents"
  | "proteines"
  | "legumes"
  | "fruits"
  | "produits-laitiers"
  | "epicerie"
  | "boissons";

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: ProductCategory;
  dietTags: DietType[];
  allergens: Allergen[];
  essential: boolean;
}

export interface UserPreferences {
  budget: number;
  diet: DietType;
  allergies: Allergen[];
  freeText: string;
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
  showAidResources: boolean;
}

export const DIET_OPTIONS: { value: DietType; label: string }[] = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarien", label: "Végétarien" },
  { value: "vegan", label: "Végan" },
  { value: "sans-porc", label: "Sans porc" },
  { value: "halal", label: "Halal" },
];

export const ALLERGEN_OPTIONS: { value: Allergen; label: string }[] = [
  { value: "gluten", label: "Gluten" },
  { value: "lactose", label: "Lactose" },
  { value: "fruits-a-coque", label: "Fruits à coque" },
  { value: "oeuf", label: "Œuf" },
  { value: "soja", label: "Soja" },
  { value: "poisson", label: "Poisson" },
  { value: "crustaces", label: "Crustacés" },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  feculents: "Féculents",
  proteines: "Protéines",
  legumes: "Légumes",
  fruits: "Fruits",
  "produits-laitiers": "Produits laitiers",
  epicerie: "Épicerie",
  boissons: "Boissons",
};

/** Seuil en €/semaine en dessous duquel on affiche les ressources d'aide alimentaire */
export const LOW_BUDGET_THRESHOLD = 25;

export const AID_RESOURCES = [
  {
    name: "Cop1",
    description: "Distribution alimentaire solidaire sur de nombreux campus.",
    url: "https://cop1.fr/",
  },
  {
    name: "Linkee",
    description: "Paniers solidaires récupérés auprès de commerçants partenaires.",
    url: "https://linkee.co/",
  },
  {
    name: "Agoraé",
    description: "Épiceries solidaires étudiantes présentes sur plusieurs villes.",
    url: "https://agorae.fr/",
  },
];

export const STORAGE_KEY = "campus-panier-preferences";
