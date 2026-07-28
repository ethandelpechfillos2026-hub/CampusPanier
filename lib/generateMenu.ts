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

// Récapitulatif hebdomadaire (inchangé) : les articles groupés par moment
// de la journée, avec le total de calories par groupe.
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
// ("10 œufs cette semaine → ~1,4 par jour").
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

export interface DayEntry {
  product: Product;
  count: number;
}

export type DaySlot = "petitDejeuner" | "dejeuner" | "diner" | "collation";

export const DAY_SLOT_ORDER: DaySlot[] = [
  "petitDejeuner",
  "dejeuner",
  "diner",
  "collation",
];

export const DAY_SLOT_LABELS: Record<DaySlot, string> = {
  petitDejeuner: "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
};

export const DAY_SLOT_ICONS: Record<DaySlot, string> = {
  petitDejeuner: "🌅",
  dejeuner: "🥗",
  diner: "🍽️",
  collation: "🍎",
};

export interface DayPlan {
  day: string;
  slots: Record<DaySlot, DayEntry[]>;
}

export interface WeeklyPlan {
  days: DayPlan[];
}

// Étale `total` occurrences le plus régulièrement possible sur 7 jours, en
// partant du jour `offset` plutôt que toujours du lundi — sinon tous les
// produits achetés en une seule unité (riz, cabillaud...) atterriraient
// systématiquement le même jour.
function spreadAcrossWeek(total: number, offset: number): number[] {
  const counts = new Array(7).fill(0);
  for (let k = 0; k < total; k++) {
    const dayIndex = (Math.floor((k * 7) / total) + offset) % 7;
    counts[dayIndex] += 1;
  }
  return counts;
}

function emptyDaySlots(): Record<DaySlot, DayEntry[]> {
  return { petitDejeuner: [], dejeuner: [], diner: [], collation: [] };
}

// Construit un planning jour par jour : chaque produit de la liste (tous ont
// désormais une quantité hebdomadaire précise) est étalé sur les 7 jours.
// "Déjeuner & Dîner" (un seul mealSlot côté produit) est réparti entre les
// deux repas au niveau de l'affichage, pour varier les repas d'un jour à
// l'autre plutôt que de répéter le même contenu midi et soir.
export function buildWeeklyPlan(items: ShoppingListItem[]): WeeklyPlan {
  const days: DayPlan[] = WEEKDAY_LABELS.map((day) => ({
    day,
    slots: emptyDaySlots(),
  }));

  const mainsByDay: DayEntry[][] = Array.from({ length: 7 }, () => []);
  let productIndex = 0;

  for (const item of items) {
    const { product, quantity } = item;
    if (!product.weeklyServings) continue;

    const total = product.weeklyServings * quantity;
    // Pas de 3 (premier avec 7) pour bien étaler les décalages entre
    // produits successifs avant de reboucler.
    const offset = (productIndex * 3) % 7;
    productIndex += 1;

    const perDayCounts = spreadAcrossWeek(total, offset);

    perDayCounts.forEach((count, dayIndex) => {
      if (count === 0) return;
      const entry: DayEntry = { product, count };
      if (product.mealSlot === "petit-dejeuner") {
        days[dayIndex].slots.petitDejeuner.push(entry);
      } else if (product.mealSlot === "encas-extra") {
        days[dayIndex].slots.collation.push(entry);
      } else {
        mainsByDay[dayIndex].push(entry);
      }
    });
  }

  // Répartit les articles "déjeuner-dîner" du jour entre les deux repas
  // pour varier, plutôt que d'afficher la même chose aux deux.
  mainsByDay.forEach((mains, dayIndex) => {
    if (mains.length === 0) return;

    if (mains.length === 1) {
      const target = dayIndex % 2 === 0 ? "dejeuner" : "diner";
      days[dayIndex].slots[target].push(mains[0]);
      return;
    }

    mains.forEach((entry, i) => {
      const target = i % 2 === 0 ? "dejeuner" : "diner";
      days[dayIndex].slots[target].push(entry);
    });
  });

  return { days };
}
