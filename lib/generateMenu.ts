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
// ("10 œufs cette semaine → ~1,4 par jour"). Retourne null pour les
// produits qui se dosent librement selon la recette (pas de weeklyServings
// défini).
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

function emptyDaySlots(): Record<DaySlot, DayEntry[]> {
  return { petitDejeuner: [], dejeuner: [], diner: [], collation: [] };
}

// Construit un planning jour par jour : pour chaque produit ayant un nombre
// d'unités défini (weeklyServings), on étale ce nombre sur les 7 jours.
// "Déjeuner & Dîner" (mealSlot unique côté produit) est réparti entre les
// deux repas au niveau de l'affichage, pour varier les repas d'un jour à
// l'autre plutôt que de répéter le même contenu midi et soir. Les produits
// sans quantité fixe (huile, pâtes, riz sec...) restent dans "pantryItems",
// à composer librement.
export function buildWeeklyPlan(items: ShoppingListItem[]): WeeklyPlan {
  const days: DayPlan[] = WEEKDAY_LABELS.map((day) => ({
    day,
    slots: emptyDaySlots(),
  }));
  const pantryItems: ShoppingListItem[] = [];

  // Étape 1 : placer petit-déjeuner et collation directement, et collecter
  // à part les articles "déjeuner-dîner" par jour pour pouvoir les répartir
  // ensuite entre les deux repas.
  const mainsByDay: DayEntry[][] = Array.from({ length: 7 }, () => []);

  for (const item of items) {
    const { product, quantity } = item;
    if (!product.weeklyServings) {
      pantryItems.push(item);
      continue;
    }

    const total = product.weeklyServings * quantity;
    const perDayCounts = spreadAcrossWeek(total);

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

  // Étape 2 : répartir les articles "déjeuner-dîner" du jour entre les deux
  // repas pour varier, plutôt que d'afficher la même chose aux deux.
  mainsByDay.forEach((mains, dayIndex) => {
    if (mains.length === 0) return;

    if (mains.length === 1) {
      // Un seul article ce jour-là : on alterne selon la parité du jour
      // pour ne pas toujours mettre la même chose au déjeuner.
      const target = dayIndex % 2 === 0 ? "dejeuner" : "diner";
      days[dayIndex].slots[target].push(mains[0]);
      return;
    }

    mains.forEach((entry, i) => {
      const target = i % 2 === 0 ? "dejeuner" : "diner";
      days[dayIndex].slots[target].push(entry);
    });
  });

  return { days, pantryItems };
}
