import {
  MEAL_SLOT_ORDER,
  MealSlot,
  Product,
  ShoppingListItem,
} from "@/lib/types";

export const WEEKDAY_LABELS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

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

export interface DayEntry {
  product: Product;
  count: number;
}

export interface DayPlan {
  day: string;
  slots: Record<MealSlot, DayEntry[]>;
}

export interface WeeklyPlan {
  days: DayPlan[];
  // Produits qui se dosent librement selon la recette (huile, pâtes, riz
  // sec...) et n'ont donc pas de quantité fixée jour par jour.
  pantryItems: ShoppingListItem[];
}

// Étale `total` occurrences le plus régulièrement possible sur 7 jours
// (ex: 10 œufs -> 2,1,2,1,2,1,1). Renvoie un tableau de 7 compteurs.
function spreadAcrossWeek(total: number): number[] {
  const counts = new Array(7).fill(0);
  for (let k = 0; k < total; k++) {
    const dayIndex = Math.floor((k * 7) / total);
    counts[dayIndex] += 1;
  }
  return counts;
}

// Construit un planning jour par jour à partir de la liste de courses : pour
// chaque produit ayant un nombre d'unités défini (weeklyServings), on étale
// ce nombre sur les 7 jours de la semaine. Les produits sans quantité fixe
// (huile, pâtes, riz sec...) sont mis de côté dans "pantryItems" plutôt que
// répartis arbitrairement.
export function buildWeeklyPlan(items: ShoppingListItem[]): WeeklyPlan {
  const days: DayPlan[] = WEEKDAY_LABELS.map((day) => ({
    day,
    slots: { "petit-dejeuner": [], "dejeuner-diner": [], "encas-extra": [] },
  }));
  const pantryItems: ShoppingListItem[] = [];

  for (const item of items) {
    const { product, quantity } = item;
    if (!product.weeklyServings) {
      pantryItems.push(item);
      continue;
    }

    const total = product.weeklyServings * quantity;
    const perDayCounts = spreadAcrossWeek(total);

    perDayCounts.forEach((count, dayIndex) => {
      if (count > 0) {
        days[dayIndex].slots[product.mealSlot].push({ product, count });
      }
    });
  }

  return { days, pantryItems };
}
