import { MEAL_SLOT_ORDER, MealSlot, Product, ShoppingListItem } from "@/lib/types";

export interface MenuSection {
  slot: MealSlot;
  items: ShoppingListItem[];
  totalKcal: number;
}

// Répartit les articles de la liste de courses par créneau de repas
// (petit-déjeuner / déjeuner-dîner / encas) à partir du mealSlot de
// chaque produit, pour donner une vue "menu" plutôt qu'une simple liste.
export function organizeMenu(items: ShoppingListItem[]): MenuSection[] {
  return MEAL_SLOT_ORDER.map((slot) => {
    const slotItems = items.filter((item) => item.product.mealSlot === slot);
    const totalKcal = slotItems.reduce(
      (sum, item) => sum + item.product.kcal * item.quantity,
      0
    );
    return { slot, items: slotItems, totalKcal };
  }).filter((section) => section.items.length > 0);
}

// Traduit la quantité hebdomadaire d'un produit en repère journalier
// ("10 œufs cette semaine → ~1,4 par jour"). Retourne null pour les
// produits qui se dosent librement selon la recette (pas de weeklyServings
// défini) : pas de répartition journalière pertinente pour ceux-là.
export function formatDailyServing(
  product: Product,
  quantity: number
): string | null {
  if (!product.weeklyServings || !product.servingUnit) return null;

  const total = product.weeklyServings * quantity;
  const perDay = Math.round((total / 7) * 10) / 10;
  const unitLabel = total > 1 ? `${product.servingUnit}s` : product.servingUnit;
  const perDayFormatted = perDay.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  });

  return `${total} ${unitLabel} cette semaine → ~${perDayFormatted} par jour`;
}
