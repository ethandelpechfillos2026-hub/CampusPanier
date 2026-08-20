import { FECULENT_IDS } from "@/lib/generateShoppingList";
import {
  CATEGORY_ORDER,
  MealOutEntry,
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

// Clés de dictionnaire associées à WEEKDAY_LABELS — voir la note sur
// `labelKey` dans lib/types.ts. `label` reste le texte français : c'est le
// repli utilisé par formatDailyServing() ci-dessous, qui construit une
// chaîne hors contexte React (ne peut pas appeler useTranslation()).
export const WEEKDAY_LABEL_KEYS = [
  "weekday.monday",
  "weekday.tuesday",
  "weekday.wednesday",
  "weekday.thursday",
  "weekday.friday",
  "weekday.saturday",
  "weekday.sunday",
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

// Clés de dictionnaire associées à DAY_SLOT_LABELS.
export const DAY_SLOT_LABEL_KEYS: Record<DaySlot, string> = {
  petitDejeuner: "daySlot.petitDejeuner",
  dejeuner: "daySlot.dejeuner",
  diner: "daySlot.diner",
  collation: "daySlot.collation",
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

// Étale `total` occurrences de façon RIGOUREUSEMENT égale sur les
// emplacements autorisés (jours pour petit-déj/collation, ou créneaux
// jour+repas pour déjeuner/dîner — voir buildMainMealSlotMap plus bas).
// `length` est la taille du tableau retourné (7 pour un étalement par jour,
// ou le nombre de créneaux déjeuner/dîner réellement disponibles dans la
// semaine). Avant, un étalement par lots entiers (ex : 3 jours avec 1
// baguette entière, 4 jours sans rien) donnait des matins très différents
// les uns des autres. Une part égale à chaque emplacement autorisé (ex : ¾
// de baguette tous les jours plutôt qu'une baguette entière 3 jours et rien
// les 4 autres) donne une semaine équivalente d'un jour à l'autre.
function distributeEvenly(
  total: number,
  allowedIndices: number[],
  length: number
): number[] {
  const counts = new Array(length).fill(0);
  const n = allowedIndices.length;
  if (n === 0 || total === 0) return counts;
  const perSlot = total / n;
  for (const index of allowedIndices) {
    counts[index] = perSlot;
  }
  return counts;
}

function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

// Unités masculines du catalogue (voir data/products.json, servingUnit) —
// ensemble fermé et connu, donc une table plutôt qu'une détection
// automatique du genre. Sert uniquement à accorder "un/une demi-" dans
// formatFractionalUnit ci-dessous. Tout le reste (non listé) est traité
// comme féminin, ce qui couvre la majorité des unités actuelles (cuillère,
// tranche, portion, part...).
const MASCULINE_SERVING_UNITS = new Set([
  "avocat",
  "citron",
  "croissant",
  "steak",
  "verre",
  "wrap",
  "yaourt",
  "œuf",
]);

// Met au pluriel une unité de portion, y compris les unités composées
// ("cuillère à soupe" -> "cuillères à soupe") où seul le premier mot varie —
// un simple ajout de "s" en fin de chaîne donnerait à tort
// "cuillère à soupes".
function pluralizeServingUnit(unit: string): string {
  const spaceIndex = unit.indexOf(" ");
  if (spaceIndex === -1) return `${unit}s`;
  return `${unit.slice(0, spaceIndex)}s${unit.slice(spaceIndex)}`;
}

// Formate une quantité fractionnaire en mots français ("un quart de
// baguette", "une demi-cuillère à soupe", "2 cuillères à soupe et quart")
// pour les produits qui se comptent à l'unité (baguette, œuf, yaourt...) —
// les grammes précis n'ont pas de sens pour ce genre d'article. Remplace
// d'anciens glyphes (¼, ½, ¾) jugés moins clairs à lire par une utilisatrice
// (retour du 8 août 2026 : "pourquoi pas juste la moitié d'une cuillère à
// soupe, c'est plus français, plus facile à comprendre").
function formatFractionalUnit(value: number, unit: string): string {
  const whole = Math.floor(value);
  const frac = round2(value - whole);
  const masculine = MASCULINE_SERVING_UNITS.has(unit);

  if (frac === 0) {
    // Ne devrait normalement pas arriver à 0 (voir displayValue dans
    // formatDayEntryQuantity, minimum ¼ affiché) — filet de sécurité.
    const count = whole === 0 ? 1 : whole;
    return `${count} ${count > 1 ? pluralizeServingUnit(unit) : unit}`;
  }

  if (whole === 0) {
    if (frac === 0.5) return `${masculine ? "un" : "une"} demi-${unit}`;
    if (frac === 0.75) return `trois quarts de ${unit}`;
    return `un quart de ${unit}`;
  }

  // Nombre mixte (ex : 1 ¾) : en français, "demi"/"quart" se placent après
  // le nombre entier ("une heure et demie", "deux heures et quart") plutôt
  // qu'accolés avec un trait d'union comme pour une fraction pure ci-dessus.
  const unitLabel = whole > 1 ? pluralizeServingUnit(unit) : unit;
  const tail =
    frac === 0.5
      ? `et ${masculine ? "demi" : "demie"}`
      : frac === 0.75
        ? "et trois quarts"
        : "et quart";
  return `${whole} ${unitLabel} ${tail}`;
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
  // Féculents principaux du déjeuner/dîner — voir FECULENT_IDS dans
  // generateShoppingList.ts, la même liste sert aux deux endroits.
  Array.from(FECULENT_IDS),
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
// Sert uniquement au petit-déjeuner et aux collations (pas de distinction
// déjeuner/dîner à faire pour ces créneaux) — voir buildMainMealSlotMap
// pour le déjeuner/dîner.
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

  return map;
}

// Un créneau "déjeuner" ou "dîner" concret de la semaine — la maison en a
// deux par jour, sauf un jour de cantine qui n'en a qu'un (le dîner ; le
// déjeuner est mangé à la cantine, jamais à la maison).
interface MainMealSlot {
  day: number;
  slot: "dejeuner" | "diner";
}

// Construit la liste ordonnée des créneaux déjeuner/dîner réellement
// disponibles à la maison cette semaine (9 à 14 selon le nombre de jours de
// cantine) — la base sur laquelle la rotation ci-dessous répartit féculents,
// légumes, fromages/charcuterie et viandes/poissons.
function buildMainMealSlots(canteenDays: number[]): MainMealSlot[] {
  const slots: MainMealSlot[] = [];
  for (let day = 0; day < 7; day++) {
    if (!canteenDays.includes(day)) slots.push({ day, slot: "dejeuner" });
    slots.push({ day, slot: "diner" });
  }
  return slots;
}

// Règle produit non négociable (retour utilisateur du 8 août 2026) : le
// déjeuner ne doit pas être un décalque du dîner, et les repas ne doivent
// pas se répéter à l'identique de jour en jour. Avant, un féculent ou une
// protéine actif un jour donné se retrouvait systématiquement à la fois au
// déjeuner ET au dîner de ce jour-là (juste des quantités différentes) —
// exactement ce qui lasse vite. On répartit maintenant chaque membre d'un
// groupe interchangeable (féculents, ou légumes/fromages/viandes-poissons
// de la même catégorie) sur un SOUS-ENSEMBLE de créneaux déjeuner/dîner
// précis, pas de jours entiers.
//
// `mealSlots` est déjà trié chronologiquement (jour 0 → 6, et pour un même
// jour déjeuner avant dîner). Chaque groupe interchangeable (les féculents
// ensemble, ou les membres d'une même catégorie comme les viandes/poissons)
// se partage les créneaux dejeuner/dîner de la semaine par un tourniquet
// PONDÉRÉ : un produit acheté en grande quantité hérite de plus de créneaux
// (pour ne pas tout recevoir d'un coup), un produit acheté en petite
// quantité en hérite de moins — mais la somme des créneaux donnés aux
// membres d'un groupe fait toujours EXACTEMENT le nombre de créneaux
// disponibles, donc jamais deux membres d'un même groupe sur le même
// créneau (voir weightedRoundRobin ci-dessous).
//
// Historique des correctifs (retours utilisateur + balayage automatisé de
// ~350 profils le 20 août 2026) :
//
// 1. (13 août 2026) Le déjeuner recopiait EXACTEMENT le dîner de la veille
//    sur les jours sans cantine. Cause : une clé `(jour + décalage dîner) %
//    n` donnait la même valeur au dîner du jour J et au déjeuner du jour
//    J+1. Corrigé par un tourniquet sur l'ordre chronologique réel des
//    créneaux plutôt qu'une formule jour+décalage.
//
// 2. (20 août 2026) Un même repas (4 aliments identiques) revenait 3+ fois
//    dans la semaine même à budget confortable, car toutes les catégories
//    démarraient leur tourniquet au même créneau 0 et leurs membres
//    "indice 0" retombaient ensemble. Corrigé en donnant à chaque groupe un
//    décalage de crédit de départ différent (voir `phaseSeed` plus bas).
//
// 3. (20 août 2026) Portions déraisonnables (jusqu'à 720 g de viande en un
//    seul repas) quand un membre n'héritait que d'un seul créneau sur ~10
//    alors que sa quantité hebdomadaire totale était grande. Une première
//    correction "élargit les créneaux de ce membre" a été tentée, mais en
//    piochant des créneaux sans savoir qu'ils appartenaient déjà à un autre
//    membre du MÊME groupe (ex. Pois chiches ET Haricots rouges, tous deux
//    dans le groupe "épicerie", combinés dans un même repas) — remplacée
//    par cette répartition pondérée qui donne le nombre de créneaux voulu
//    au bon membre DÈS le départ, sans jamais chevaucher un autre membre du
//    même groupe.
const MAX_SERVINGS_PER_MEAL = 2.5;

// Répartit `slotCount` créneaux (0..slotCount-1) entre les membres d'un
// groupe interchangeable, proportionnellement à `weights` (nombre minimum
// de créneaux voulu pour chaque membre — voir MAX_SERVINGS_PER_MEAL), en
// garantissant : (a) chaque créneau va à UN SEUL membre (jamais de
// chevauchement au sein du groupe), (b) les créneaux d'un même membre sont
// étalés le plus régulièrement possible sur la semaine plutôt que collés
// les uns aux autres (algorithme classique de répartition pondérée en
// tourniquet, comme l'ordonnancement réseau "Weighted Round Robin").
// `phaseSeed` désynchronise le point de départ d'un groupe à l'autre pour
// que deux groupes différents (ex. féculents et légumes) ne retombent pas
// systématiquement sur les mêmes créneaux semaine après semaine.
function weightedRoundRobin(
  weights: number[],
  slotCount: number,
  phaseSeed: number
): number[][] {
  const n = weights.length;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  const result: number[][] = weights.map(() => []);
  const credits = weights.map((_, i) => ((i * 97 + phaseSeed * 31) % totalWeight) - totalWeight);

  for (let slot = 0; slot < slotCount; slot++) {
    for (let i = 0; i < n; i++) credits[i] += weights[i];
    let winner = 0;
    for (let i = 1; i < n; i++) {
      if (credits[i] > credits[winner]) winner = i;
    }
    result[winner].push(slot);
    credits[winner] -= totalWeight;
  }

  return result;
}

function buildMainMealSlotMap(
  items: ShoppingListItem[],
  mealSlots: MainMealSlot[]
): Map<string, number[]> {
  const map = new Map<string, number[]>();

  // Poids d'un membre = nombre minimum de créneaux nécessaire pour que sa
  // quantité hebdomadaire reste sous MAX_SERVINGS_PER_MEAL par repas — un
  // produit acheté en grosse quantité hérite ainsi automatiquement de plus
  // de créneaux qu'un produit acheté en petite quantité, sans jamais
  // dépasser le nombre total de créneaux disponibles pour le groupe.
  function weightFor(id: string): number {
    const item = items.find((i) => i.product.id === id);
    if (!item?.product.weeklyServings) return 1;
    const total = item.product.weeklyServings * item.quantity;
    return Math.max(1, Math.ceil(total / MAX_SERVINGS_PER_MEAL));
  }

  function assignGroup(memberIds: string[], phaseSeed: number) {
    const weights = memberIds.map(weightFor);
    const allocation = weightedRoundRobin(weights, mealSlots.length, phaseSeed);
    memberIds.forEach((id, i) => map.set(id, allocation[i]));
  }

  const presentIds = new Set(items.map((item) => item.product.id));
  const feculentFamily = Array.from(FECULENT_IDS).filter((id) => presentIds.has(id));
  if (feculentFamily.length > 1) assignGroup(feculentFamily, 0);

  // Rotation des accompagnements (légumes, fromages/charcuterie,
  // viandes/poissons...) : sans ça, TOUS les articles achetés dans une
  // catégorie pour ce créneau (pois chiches, concombre, salade, chou-fleur,
  // oignon, camembert, rillettes, jambon de dinde...) se retrouvaient
  // combinés dans le même repas — bien trop long à préparer pour un
  // étudiant. On les fait plutôt tourner, un sous-ensemble par catégorie et
  // par créneau, avec une part plus grosse à chaque apparition (ex : 250 g
  // de blanc de dinde un soir plutôt que 130 g de poulet + sole +
  // Saint-Jacques le même soir). Chaque catégorie reçoit une graine de
  // phase distincte (voir note ci-dessus) pour ne pas retomber en même
  // temps que les autres catégories sur les mêmes créneaux.
  CATEGORY_ORDER.forEach((category, categoryIndex) => {
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
    if (members.length > 1) assignGroup(members, categoryIndex * 3 + 1);
  });

  return map;
}

function emptyDaySlots(): Record<DaySlot, DayEntry[]> {
  return { petitDejeuner: [], dejeuner: [], diner: [], collation: [] };
}

// Construit un planning jour par jour : chaque produit de la liste (tous ont
// désormais une quantité hebdomadaire précise) est étalé sur la semaine.
// Petit-déjeuner et collations s'étalent sur les 7 jours (voir
// buildFamilyDayMap) ; déjeuner et dîner s'étalent directement sur les
// créneaux réellement disponibles (voir buildMainMealSlotMap), ce qui
// garantit que les deux repas d'un même jour, et les mêmes repas de jours
// différents, ne sont pas systématiquement identiques quand il y a de la
// variété dans le panier. `canteenDays` (0 = Lundi ... 4 = Vendredi) retire
// le déjeuner à la maison ces jours-là (mangé à la cantine).
export function buildWeeklyPlan(
  items: ShoppingListItem[],
  canteenDays: number[] = []
): WeeklyPlan {
  const days: DayPlan[] = WEEKDAY_LABELS.map((day) => ({
    day,
    slots: emptyDaySlots(),
  }));

  const familyDayMap = buildFamilyDayMap(items);
  const allWeekDays = [0, 1, 2, 3, 4, 5, 6];
  const mealSlots = buildMainMealSlots(canteenDays);
  const allMealSlotIndices = mealSlots.map((_, index) => index);
  const mainMealSlotMap = buildMainMealSlotMap(items, mealSlots);

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

    if (product.mealSlot === "petit-dejeuner" || product.mealSlot === "encas-extra") {
      // Un produit membre d'une "famille" (voir plus haut) n'a droit qu'à
      // ses jours réservés, pour ne jamais tomber le même jour qu'un autre
      // membre de la même famille — sinon "Mon menu" propose baguette +
      // biscottes + pain de mie le même petit-déjeuner.
      const allowedDays = familyDayMap.get(product.id) ?? allWeekDays;
      const perDayCounts = distributeEvenly(total, allowedDays, 7);
      perDayCounts.forEach((count, dayIndex) => {
        if (count === 0) return;
        const entry: DayEntry = { product, count };
        if (product.mealSlot === "petit-dejeuner") {
          days[dayIndex].slots.petitDejeuner.push(entry);
        } else {
          days[dayIndex].slots.collation.push(entry);
        }
      });
      continue;
    }

    // Déjeuner/dîner : réparti directement sur les créneaux autorisés (voir
    // buildMainMealSlotMap) — jamais sur des jours entiers ensuite coupés en
    // deux, pour que déjeuner et dîner puissent vraiment différer.
    const allowedSlotIndices = mainMealSlotMap.get(product.id) ?? allMealSlotIndices;
    const perSlotCounts = distributeEvenly(total, allowedSlotIndices, mealSlots.length);
    perSlotCounts.forEach((count, slotIndex) => {
      if (count === 0) return;
      const { day, slot } = mealSlots[slotIndex];
      const entry: DayEntry = { product, count };
      if (slot === "dejeuner") {
        days[day].slots.dejeuner.push(entry);
      } else {
        days[day].slots.diner.push(entry);
      }
    });
  }

  return { days };
}

// Retire du planning les repas marqués "mangé dehors" (imprévu, voir
// MealOutEntry) et regroupe leurs ingrédients dans un pot commun "bonus" —
// déjà achetés, mais plus liés à un jour précis. On ne les réassigne PAS
// arbitrairement à un autre jour : ce jour-là a déjà son propre repas
// complet, y ajouter une double portion n'aurait pas de sens. Ces
// ingrédients restent disponibles pour un futur repas au choix (rab, autre
// soir, congélateur...).
export function applyMealsOut(
  plan: WeeklyPlan,
  mealsOut: MealOutEntry[]
): { days: DayPlan[]; bonusItems: DayEntry[] } {
  const days: DayPlan[] = plan.days.map((day) => ({
    day: day.day,
    slots: {
      petitDejeuner: [...day.slots.petitDejeuner],
      dejeuner: [...day.slots.dejeuner],
      diner: [...day.slots.diner],
      collation: [...day.slots.collation],
    },
  }));

  const bonusMap = new Map<string, DayEntry>();

  for (const entry of mealsOut) {
    const day = days[entry.dayIndex];
    if (!day) continue;
    const removed = day.slots[entry.slot];
    day.slots[entry.slot] = [];
    for (const item of removed) {
      const existing = bonusMap.get(item.product.id);
      if (existing) {
        existing.count = round2(existing.count + item.count);
      } else {
        bonusMap.set(item.product.id, { product: item.product, count: item.count });
      }
    }
  }

  return { days, bonusItems: Array.from(bonusMap.values()) };
}
