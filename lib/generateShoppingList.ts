import productsData from "@/data/products.json";
import {
  LOW_BUDGET_THRESHOLD,
  Product,
  ProductCategory,
  ShoppingListItem,
  ShoppingListResult,
  UserPreferences,
} from "@/lib/types";

const products = productsData as Product[];

const CATEGORY_PRIORITY: ProductCategory[] = [
  "feculents",
  "proteines",
  "legumes",
  "fruits",
  "produits-laitiers",
  "epicerie",
  "boissons",
];

function matchesDiet(product: Product, diet: UserPreferences["diet"]): boolean {
  return product.dietTags.includes(diet);
}

function matchesAllergies(
  product: Product,
  allergies: UserPreferences["allergies"]
): boolean {
  return !product.allergens.some((allergen) => allergies.includes(allergen));
}

function matchesFreeText(product: Product, freeText: string): boolean {
  const query = freeText.trim().toLowerCase();
  if (!query) return true;

  const keywords = query.split(/[\s,;]+/).filter(Boolean);
  const haystack = `${product.name} ${product.category}`.toLowerCase();

  return keywords.some((keyword) => haystack.includes(keyword));
}

function filterProducts(preferences: UserPreferences): Product[] {
  return products.filter(
    (product) =>
      matchesDiet(product, preferences.diet) &&
      matchesAllergies(product, preferences.allergies) &&
      matchesFreeText(product, preferences.freeText)
  );
}

function sortProducts(filtered: Product[]): Product[] {
  return [...filtered].sort((a, b) => {
    if (a.essential !== b.essential) {
      return a.essential ? -1 : 1;
    }

    const categoryDiff =
      CATEGORY_PRIORITY.indexOf(a.category) -
      CATEGORY_PRIORITY.indexOf(b.category);

    if (categoryDiff !== 0) return categoryDiff;

    return a.price - b.price;
  });
}

export function generateShoppingList(
  preferences: UserPreferences
): ShoppingListResult {
  const filtered = sortProducts(filterProducts(preferences));
  const items: ShoppingListItem[] = [];
  let total = 0;

  for (const product of filtered) {
    const lineTotal = product.price;
    if (total + lineTotal <= preferences.budget) {
      items.push({ product, quantity: 1 });
      total += lineTotal;
    }
  }

  const remaining = Math.max(0, preferences.budget - total);

  return {
    items,
    total: Math.round(total * 100) / 100,
    budget: preferences.budget,
    remaining: Math.round(remaining * 100) / 100,
    isOverBudget: false,
    showAidResources: preferences.budget < LOW_BUDGET_THRESHOLD,
  };
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export { products };
