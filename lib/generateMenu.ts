import {
  CATEGORY_ORDER,
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

// Étale `total` occurrences de façon RIGOUREUSEMENT égale sur les jours
// autorisés (tous les 7 jours par défaut, ou un sous-ensemble pour les
// "familles" de produits interchangeables — voir plus bas). Avant, un
// étalement par lots entiers (ex : 3 jours avec 1 baguette entière, 4 jours
// sans rien) donnait des matins très différents les uns des autres. Une
// part égale chaque jour (ex : ¾ de baguette tous les jours plutôt qu'une
// baguette entière 3 jours et rien les 4 autres) donne une semaine
// équivalente d'un jour à l'autre, comme demandé.
function evenlySpread(total: number, allowedDays: number[]): number[] {
  const counts = new Array(7).fill(0);
  const n = allowedDays.length;
  if (n === 0 || total === 0) return counts;
  const perDay = total / n;
  for (const day of allowedDays) {
    counts[day] = perDay;
  }
  return counts;
}

function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

// Formate une quantité fractionnaire en glyphe lisible ("¼", "½", "¾") pour
// les produits qui se comptent à l'unité (baguette, œuf, yaourt...) — les
// grammes précis n'ont pas de sens pour ce genre d'article.
function formatFractionalUnit(value: number, unit: string): string {
  const whole = Math.floor(value);
  const frac = round2(value - whole);
  let fracGlyph = "";
  if (frac === 0.25) fracGlyph = "¼";
  else if (frac === 0.5) fracGlyph = "½";
  else if (frac === 0.75) fracGlyph = "¾";

  const unitLabel = value > 1 ? `${unit}s` : unit;
  const numberLabel =
    whole === 0 ? fracGlyph : fracGlyph ? `${whole} ${fracGlyph}` : `${whole}`;

  return `${numberLabel} ${unitLabel}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Formate la quantité du jour pour un article de "Mon menu" : des grammes
// arrondis à 5 g près pour les produits qui se dosent en poids (riz,
// pâtes...), ou une fraction lisible (¼, ½, ¾, 1, 1 ¼...) pour les produits
// qui se comptent à l'unité (baguette, œuf...). Le résultat n'est jamais 0
// tant que le produit est présent ce jour-là (minimum ¼ unité affiché).
export function formatDayEntryQuantity(
  product: Product,
  rawCount: number
): string {
  if (product.gramsPerServing) {
    const grams = Math.max(
      5,
      Math.round((rawCount * product.gramsPerServing) / 5) * 5
    );
    return `${grams} g`;
  }
  if (!product.servingUnit) return `${rawCount}`;

  const rounded = roundToQuarter(rawCount);
  const displayValue = rounded === 0 && rawCount > 0 ? 0.25 : rounded;
  return formatFractionalUnit(displayValue, product.servingUnit);
}

// Groupes de produits qui jouent le même rôle dans un repas (plusieurs
// féculents ou plusieurs laitiers du petit-déj en même temps, ça n'a pas de
// sens). Quand plusieurs membres d'un même groupe sont dans le panier, on
// leur réserve chacun des jours différents plutôt que de les laisser
// s'empiler le même jour.
const PRODUCT_FAMILIES: string[][] = [
  // Féculents/viennoiseries du petit-déjeuner. Sans cette liste à jour, les
  // nouveaux produits de boulangerie (pain d'épices, pain au chocolat...)
  // pouvaient tomber le même jour que croissants/brioche — d'où le
  // "croissant + pain d'épices + pain au chocolat" un même matin.
  [
    "pain-complet", "baguette", "baguette-tradition", "pains-mie",
    "pain-cereales", "croissants", "biscottes", "brioche", "pain-epices",
    "pain-au-chocolat", "pain-aux-raisins", "chausson-pomme",
    "pain-de-campagne", "pain-seigle", "pain-nordique",
    "pain-complet-graines", "baguette-graines", "pain-brie",
  ],
  // Laitiers du petit-déjeuner.
  ["yaourt-nature", "yaourt-grec", "fromage-blanc", "skyr", "petit-suisse", "faisselle", "cottage-cheese", "yaourt-soja"],
  // Variantes de lait à boire — redondantes entre elles (pas de raison
  // d'avoir "lait" ET "lait entier" ET "lait écrémé" le même matin).
  ["lait", "lait-entier", "lait-ecreme"],
  // Féculents principaux du déjeuner/dîner.
  ["riz", "pates", "pommes-de-terre", "quinoa", "semoule-couscous", "riz-complet", "pates-completes", "spaghetti", "boulgour", "polenta", "patate-douce", "nouilles-chinoises"],
  // Douceurs/collations sucrées — pour éviter d'empiler chips + cookies +
  // financiers + tiramisu le même jour quand plusieurs sont sélectionnés.
  [
    "chips", "biscuits-sables", "cookie", "financier", "madeleine",
    "muffin", "tarte-fine", "galette-bretonne", "popcorn", "gateaux-secs",
    "bonbons", "chocolat-noir", "barres-cereales", "creme-fouettee",
    "mousse-chocolat", "tiramisu", "flan", "glace-vanille",
  ],
];

// Pour chaque produit membre d'une famille présente en plusieurs
// exemplaires dans le panier, calcule les jours (0-6) qui lui sont réservés
// — les autres jours reviennent aux autres membres de la même famille.
function buildFamilyDayMap(items: ShoppingListItem[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  const presentIds = new Set(items.map((item) => item.product.id));

  for (const family of PRODUCT_FAMILIES) {
    const present = family.filter((id) => presentIds.has(id));
    if (present.length <= 1) continue; // pas de conflit possible

    present.forEach((id, memberIndex) => {
      const allowedDays = [0, 1, 2, 3, 4, 5, 6].filter(
        (day) => day % present.length === memberIndex
      );
      map.set(id, allowedDays);
    });
  }

  // Rotation des accompagnements du déjeuner-dîner (légumes, féculents pas
  // déjà couverts par une famille, fromages/charcuterie, viandes/poissons...)
  // : sans ça, TOUS les articles achetés dans une catégorie pour ce créneau
  // (pois chiches, concombre, salade, chou-fleur, oignon, camembert,
  // rillettes, jambon de dinde...) se retrouvaient combinés dans le même
  // repas — bien trop long à préparer pour un étudiant. On les fait plutôt
  // tourner un seul par catégorie et par jour, avec une part plus grosse à
  // chaque apparition (ex : 250 g de blanc de dinde un soir plutôt que
  // 130 g de poulet + sole + Saint-Jacques le même soir). Ça laisse au
  // maximum un féculent + un légume + un produit "frais" + une
  // viande/poisson par jour, répartis ensuite entre déjeuner et dîner.
  for (const category of CATEGORY_ORDER) {
    const members = items
      .filter(
        (item) =>
          item.product.category === category &&
          item.product.mealSlot === "dejeuner-diner" &&
          item.product.weeklyServings &&
          !item.product.isCondiment &&
          !map.has(item.product.id) // priorité aux familles déjà assignées (ex : pommes de terre/patate douce dans les féculents)
      )
      .map((item) => item.product.id);
    if (members.length <= 1) continue;

    members.forEach((id, memberIndex) => {
      const allowedDays = [0, 1, 2, 3, 4, 5, 6].filter(
        (day) => day % members.length === memberIndex
      );
      map.set(id, allowedDays);
    });
  }

  return map;
}

function emptyDaySlots(): Record<DaySlot, DayEntry[]> {
  return { petitDejeuner: [], dejeuner: [], diner: [], collation: [] };
}

// Indices (0 = Lundi ... 6 = Dimanche) des jours de semaine — la cantine
// universitaire n'existe généralement que du lundi au vendredi, le week-end
// reste donc un vrai déjeuner+dîner à la maison même en mode cantine.
const WEEKDAY_INDICES = [0, 1, 2, 3, 4];

// Construit un planning jour par jour : chaque produit de la liste (tous ont
// désormais une quantité hebdomadaire précise) est étalé sur les 7 jours.
// "Déjeuner & Dîner" (un seul mealSlot côté produit) est réparti à parts
// égales entre les deux repas au niveau de l'affichage — féculent, légume
// et protéine du jour se retrouvent moitié au déjeuner, moitié au dîner,
// plutôt que, par exemple, tout le féculent au déjeuner et seulement la
// protéine au dîner (repas déséquilibré). Les deux repas du jour sont donc
// similaires en quantité mais jamais identiques, ce qui est plus simple à
// préparer et plus logique qu'une répartition aléatoire par article.
// `eatsLunchAtCanteen` : si activé, du lundi au vendredi tout part au dîner
// (le déjeuner est mangé à la cantine, pas à la maison) — le week-end
// garde le partage normal entre les deux repas.
export function buildWeeklyPlan(
  items: ShoppingListItem[],
  eatsLunchAtCanteen = false
): WeeklyPlan {
  const days: DayPlan[] = WEEKDAY_LABELS.map((day) => ({
    day,
    slots: emptyDaySlots(),
  }));

  const mainsByDay: DayEntry[][] = Array.from({ length: 7 }, () => []);
  const familyDayMap = buildFamilyDayMap(items);
  const allWeekDays = [0, 1, 2, 3, 4, 5, 6];

  for (const item of items) {
    const { product, quantity } = item;
    // Les condiments (huile, sucre, moutarde...) restent dans "Ma liste"
    // mais ne sont jamais un repas à part entière — on ne les affiche pas
    // comme ligne indépendante du planning jour par jour. Exception : les
    // pâtes à tartiner (confiture, beurre, miel...) SONT affichées, parce
    // qu'on veut justement voir "avec quoi" manger le pain du petit-déjeuner
    // — contrairement à l'huile ou au sel, invisibles par nature.
    if (!product.weeklyServings || (product.isCondiment && !product.isSpread)) {
      continue;
    }

    const total = product.weeklyServings * quantity;

    // Un produit membre d'une "famille" (voir plus haut) n'a droit qu'à ses
    // jours réservés, pour ne jamais tomber le même jour qu'un autre membre
    // de la même famille — sinon "Mon menu" propose baguette + biscottes +
    // pain de mie le même petit-déjeuner. Dans les deux cas, la quantité
    // hebdomadaire est répartie à parts égales sur les jours autorisés.
    const allowedDays = familyDayMap.get(product.id) ?? allWeekDays;
    const perDayCounts = evenlySpread(total, allowedDays);

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

  // Répartit les articles "déjeuner-dîner" du jour ENTRE les deux repas de
  // façon déséquilibrée à dessein (60/40) plutôt que pile à moitié — un
  // partage à parts strictement égales donnait deux repas IDENTIQUES (même
  // articles, mêmes quantités), ce qui devient vite lassant à répétition.
  // Chaque article penche tantôt vers le déjeuner, tantôt vers le dîner
  // (l'alternance dépend de l'article et du jour), pour que les deux repas
  // ne soient jamais identiques tout en gardant un total de la journée
  // équivalent — sans revenir au problème initial où un repas se
  // retrouvait avec tout le féculent et l'autre avec rien que la protéine.
  const LEAN_SHARE = 0.6;
  mainsByDay.forEach((mains, dayIndex) => {
    if (eatsLunchAtCanteen && WEEKDAY_INDICES.includes(dayIndex)) {
      // Cantine en semaine : tout au dîner, rien au déjeuner à la maison.
      mains.forEach((entry) => {
        days[dayIndex].slots.diner.push(entry);
      });
      return;
    }

    mains.forEach((entry, entryIndex) => {
      const leansLunch = (entryIndex + dayIndex) % 2 === 0;
      const majorShare = round2(entry.count * LEAN_SHARE);
      const minorShare = round2(entry.count - majorShare);
      const lunchShare = leansLunch ? majorShare : minorShare;
      const dinnerShare = leansLunch ? minorShare : majorShare;
      if (lunchShare > 0) {
        days[dayIndex].slots.dejeuner.push({ product: entry.product, count: lunchShare });
      }
      if (dinnerShare > 0) {
        days[dayIndex].slots.diner.push({ product: entry.product, count: dinnerShare });
      }
    });
  });

  return { days };
}
