import { BodyStats } from "@/lib/types";

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
  const calories = dailyCalories ?? Math.round(bmr * ACTIVITY_FACTOR);

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
