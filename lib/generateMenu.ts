import { MEAL_SLOT_ORDER, MealSlot, ShoppingListItem } from "@/lib/types";

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
