import { BodyStats, MealOutEntry } from "@/lib/types";

export interface MacroTargets {
  calories: number;
  proteinG: number;
  lipidesG: number;
  glucidesG: number;
}

// Étudiant·e type ni sédentaire ni très sportif·ve — hypothèse assumée en
// l'absence d'une vraie question sur le niveau d'activité (qu'on pourra
// ajouter plus tard si besoin d'affiner). Affichée clairement dans
// l'interface pour que ce ne soit jamais un chiffre sorti de nulle part.
const ACTIVITY_FACTOR = 1.4;

// Estimation d'un repas standard de cantine universitaire (entrée + plat +
// dessert) — forcément approximatif puisque ça varie d'un campus à l'autre,
// mais permet d'éviter de prévoir (et d'acheter) des courses pour un repas
// qu'on ne mange pas à la maison. Le nombre de jours cantine varie d'une
// personne à l'autre (voir stats.canteenDays) ; on lisse cette quantité sur
// les 7 jours pour donner UN seul repère quotidien simple plutôt qu'un
// chiffre qui change selon le jour.
const CANTINE_LUNCH_KCAL_ESTIMATE = 850;
const DAYS_PER_WEEK = 7;
const MIN_HOME_CALORIES = 800;

// Calories que les courses doivent réellement couvrir : le besoin quotidien
// total moins la moyenne hebdomadaire de ce qui est mangé à la cantine.
// Utilisé partout où on raisonne sur un objectif calorique pour éviter de
// prévoir (et acheter) de la nourriture pour un repas pris à l'extérieur.
export function getEffectiveDailyCalories(
  stats: BodyStats,
  dailyCalories: number | null
): number | null {
  const canteenDaysCount = stats.canteenDays?.length ?? 0;
  if (dailyCalories === null || canteenDaysCount === 0) return dailyCalories;
  const avgCantineKcal = (canteenDaysCount * CANTINE_LUNCH_KCAL_ESTIMATE) / DAYS_PER_WEEK;
  return Math.max(MIN_HOME_CALORIES, Math.round(dailyCalories - avgCantineKcal));
}

// Formule de Mifflin-St Jeor — la plus fiable des estimations simples du
// métabolisme de base à partir du poids/taille/âge/sexe.
function computeBmr(sex: "homme" | "femme", weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "homme" ? base + 5 : base - 161;
}

// Calcule un repère personnalisé (calories + grammes de protéines/lipides/
// glucides par jour) à partir du profil corporel. Retourne null tant que le
// profil n'est pas complet — ce n'est qu'un repère indicatif (comme le
// reste de l'app, pas un plan nutritionnel médical), mais bien plus parlant
// qu'un simple "riche/moyen/faible".
export function computeMacroTargets(
  stats: BodyStats,
  dailyCalories: number | null
): MacroTargets | null {
  const { sex, weightKg, heightCm, age } = stats;
  if (!sex || !weightKg || !heightCm || !age) return null;

  const bmr = computeBmr(sex, weightKg, heightCm, age);
  const totalCalories = dailyCalories ?? Math.round(bmr * ACTIVITY_FACTOR);
  // Objectif réellement visé par les courses — voir getEffectiveDailyCalories.
  const calories = getEffectiveDailyCalories(stats, totalCalories) ?? totalCalories;

  // ~1,8 g/kg : repère courant pour une personne active qui veut couvrir
  // ses besoins sans viser une performance sportive précise.
  const proteinG = Math.round(weightKg * 1.8);
  const proteinKcal = proteinG * 4;

  // ~30 % des calories en lipides, repère nutritionnel standard.
  const lipidesKcal = calories * 0.3;
  const lipidesG = Math.round(lipidesKcal / 9);

  // Le reste en glucides.
  const glucidesKcal = Math.max(0, calories - proteinKcal - lipidesKcal);
  const glucidesG = Math.round(glucidesKcal / 4);

  return { calories: Math.round(calories), proteinG, lipidesG, glucidesG };
}

// Objectifs réellement utilisés : ceux fixés à la main dans le profil
// (`macroOverride`) priment toujours sur le calcul automatique — pour les
// personnes qui savent déjà ce qu'elles visent (sportif·ves, suivi
// nutritionnel existant...) et veulent, par exemple, moins de lipides que
// ce que la formule par défaut propose. Les calories ne sont PAS un réglage
// séparé dans ce cas : 1 g de protéines/glucides = 4 kcal, 1 g de lipides =
// 9 kcal, donc dès qu'on ajuste les grammes, le total de calories doit
// suivre automatiquement — sinon l'un des deux chiffres affichés ment.
export function getActiveMacroTargets(
  stats: BodyStats,
  dailyCalories: number | null
): MacroTargets | null {
  const computed = computeMacroTargets(stats, dailyCalories);
  if (!stats.macroOverride) return computed;

  const { proteinG, lipidesG, glucidesG } = stats.macroOverride;
  const calories = proteinG * 4 + lipidesG * 9 + glucidesG * 4;

  return { calories, proteinG, lipidesG, glucidesG };
}

// Nombre de créneaux "déjeuner-dîner" dans une semaine (7 jours x 2 repas) —
// sert de dénominateur pour répartir ce qu'il reste à manger à la maison.
const TOTAL_LUNCH_DINNER_SLOTS = DAYS_PER_WEEK * 2;

// Objectif kcal par repas "maison" restant cette semaine, une fois retirés
// les repas cantine ET les repas mangés dehors de façon imprévue (voir
// MealOutEntry, loggés à la volée dans "Mon menu"). Repère informatif
// seulement : les courses sont déjà achetées pour la semaine, ça ne change
// rien à la liste — ça aide juste à savoir combien manger pour le reste de
// la semaine plutôt que de laisser l'objectif calorique de départ mentir.
// Exprimé par REPAS (déjeuner ou dîner) plutôt que par jour, parce qu'un
// jour cantine ou "mangé dehors" n'a plus forcément deux repas maison à
// répartir également.
export function getRemainingHomeMealTarget(
  stats: BodyStats,
  dailyCalories: number | null,
  mealsOut: MealOutEntry[]
): number | null {
  if (dailyCalories === null) return null;

  const canteenDaysCount = stats.canteenDays?.length ?? 0;
  const canteenKcal = canteenDaysCount * CANTINE_LUNCH_KCAL_ESTIMATE;
  const mealsOutKcal = mealsOut.reduce((sum, m) => sum + m.estimatedKcal, 0);

  const remainingSlots =
    TOTAL_LUNCH_DINNER_SLOTS - canteenDaysCount - mealsOut.length;
  if (remainingSlots <= 0) return null;

  const weeklyTotal = dailyCalories * DAYS_PER_WEEK;
  const remainingBudget = weeklyTotal - canteenKcal - mealsOutKcal;

  return Math.max(0, Math.round(remainingBudget / remainingSlots));
}
