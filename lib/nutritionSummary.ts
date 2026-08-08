import { MacroTargets } from "@/lib/macros";
import { ShoppingListItem } from "@/lib/types";

// Repères nutritionnels officiels pour un adulte à 2000 kcal/jour — les
// mêmes valeurs qu'on retrouve en "% AR" (apport de référence) sur
// l'étiquette de tout produit alimentaire vendu en France/UE (règlement
// (UE) n°1169/2011, annexe XIII, partie B). Volontairement PAS de repère
// pour les fibres ici : ce même règlement interdit d'exprimer les fibres
// en % d'apport de référence (aucune valeur officielle n'existe) — leur
// total brut est affiché sans pourcentage plutôt que d'inventer un seuil.
export const EU_REFERENCE_INTAKE_2000KCAL = {
  kcal: 2000,
  lipidesG: 70,
  satureesG: 20,
  glucidesG: 260,
  sucresG: 90,
  proteinG: 50,
  selG: 5,
};

export interface WeeklyNutritionTotals {
  kcal: number;
  proteinG: number;
  glucidesG: number;
  sucresG: number;
  lipidesG: number;
  satureesG: number;
  fibresG: number;
  selG: number;
}

const NUTRIENT_KEYS: (keyof WeeklyNutritionTotals)[] = [
  "kcal",
  "proteinG",
  "glucidesG",
  "sucresG",
  "lipidesG",
  "satureesG",
  "fibresG",
  "selG",
];

export interface ShoppingListNutritionSummary {
  // Moyenne PAR JOUR sur la semaine, pour tout ce qui a pu être compté.
  dailyAverage: WeeklyNutritionTotals;
  // Articles dont la quantité a pu être convertie en grammes réels
  // (portion hebdomadaire × poids de portion connu) ET dont la fiche
  // nutritionnelle a au moins une valeur — donc réellement comptés.
  itemsCounted: number;
  // Articles ignorés : condiments dosés librement (huile, sel...), ou
  // produits comptés à l'unité sans poids de portion connu (baguette,
  // tranche de pain, cuillère à soupe...) — jamais un poids inventé pour
  // les inclure quand même.
  itemsExcluded: number;
  totalItems: number;
}

function emptyTotals(): WeeklyNutritionTotals {
  return {
    kcal: 0,
    proteinG: 0,
    glucidesG: 0,
    sucresG: 0,
    lipidesG: 0,
    satureesG: 0,
    fibresG: 0,
    selG: 0,
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Somme, sur toute la semaine de courses, les nutriments des articles dont
// on connaît à la fois un poids réel (weeklyServings × gramsPerServing ×
// quantité achetée) ET une fiche nutritionnelle tracée (nutritionPer100g,
// voir lib/types.ts) — jamais une estimation inventée pour les autres.
// C'est un bilan PARTIEL et assumé comme tel (voir itemsExcluded) : les
// condiments dosés librement et les produits comptés à l'unité sans poids
// connu n'y figurent pas, plutôt que de leur attribuer un poids au hasard.
export function computeShoppingListNutrition(
  items: ShoppingListItem[]
): ShoppingListNutritionSummary {
  const weeklyTotals = emptyTotals();
  let itemsCounted = 0;
  let itemsExcluded = 0;

  for (const { product, quantity } of items) {
    const nutrition = product.nutritionPer100g;
    if (!product.weeklyServings || !product.gramsPerServing || !nutrition) {
      itemsExcluded += 1;
      continue;
    }

    const totalGrams = product.weeklyServings * quantity * product.gramsPerServing;
    const factor = totalGrams / 100;

    let hasAnyValue = false;
    for (const key of NUTRIENT_KEYS) {
      const value = nutrition[key];
      if (value != null) {
        weeklyTotals[key] += value * factor;
        hasAnyValue = true;
      }
    }

    if (hasAnyValue) itemsCounted += 1;
    else itemsExcluded += 1;
  }

  const dailyAverage = emptyTotals();
  for (const key of NUTRIENT_KEYS) {
    dailyAverage[key] = round1(weeklyTotals[key] / 7);
  }

  return {
    dailyAverage,
    itemsCounted,
    itemsExcluded,
    totalItems: items.length,
  };
}

export interface PersonalCoverage {
  kcalPct: number | null;
  proteinPct: number | null;
  lipidesPct: number | null;
  glucidesPct: number | null;
}

// Compare la moyenne quotidienne du panier à l'objectif PERSONNALISÉ de la
// personne (voir lib/macros.ts, getActiveMacroTargets) — null pour chaque
// pourcentage tant que le profil corporel n'est pas complet (pas d'objectif
// calculable), plutôt qu'un pourcentage basé sur un repère générique qui
// ne la concernerait pas.
export function computePersonalCoverage(
  daily: WeeklyNutritionTotals,
  targets: MacroTargets | null
): PersonalCoverage {
  if (!targets) {
    return { kcalPct: null, proteinPct: null, lipidesPct: null, glucidesPct: null };
  }
  const pct = (value: number, target: number): number | null =>
    target > 0 ? Math.round((value / target) * 100) : null;

  return {
    kcalPct: pct(daily.kcal, targets.calories),
    proteinPct: pct(daily.proteinG, targets.proteinG),
    lipidesPct: pct(daily.lipidesG, targets.lipidesG),
    glucidesPct: pct(daily.glucidesG, targets.glucidesG),
  };
}

export interface ReferenceCoverage {
  sucresPct: number;
  satureesPct: number;
  selPct: number;
}

// Compare la moyenne quotidienne du panier aux repères officiels UE (base
// 2000 kcal, voir EU_REFERENCE_INTAKE_2000KCAL ci-dessus) — toujours
// calculable, contrairement à computePersonalCoverage qui a besoin d'un
// profil corporel complet.
export function computeReferenceCoverage(
  daily: WeeklyNutritionTotals
): ReferenceCoverage {
  return {
    sucresPct: Math.round(
      (daily.sucresG / EU_REFERENCE_INTAKE_2000KCAL.sucresG) * 100
    ),
    satureesPct: Math.round(
      (daily.satureesG / EU_REFERENCE_INTAKE_2000KCAL.satureesG) * 100
    ),
    selPct: Math.round((daily.selG / EU_REFERENCE_INTAKE_2000KCAL.selG) * 100),
  };
}
