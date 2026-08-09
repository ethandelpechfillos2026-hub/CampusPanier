import { DashboardStats } from "@/lib/stats";

export interface Achievement {
  id: string;
  icon: string;
  // `label`/`description` restent le texte français : repli utilisé hors
  // contexte React. `labelKey`/`descriptionKey` sont les clés de
  // dictionnaire (voir lib/i18n/dictionaries/) utilisées par les composants
  // via t(...) pour l'affichage traduit — voir la note sur `labelKey` dans
  // lib/types.ts.
  label: string;
  labelKey: string;
  description: string;
  descriptionKey: string;
  isUnlocked: (stats: DashboardStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "premier-panier",
    icon: "🛒",
    label: "Premier panier",
    labelKey: "achievements.premierPanier.label",
    description: "Génère ta toute première liste de courses.",
    descriptionKey: "achievements.premierPanier.description",
    isUnlocked: (s) => s.listsGenerated >= 1,
  },
  {
    id: "panier-eclair",
    icon: "⚡",
    label: "Panier éclair",
    labelKey: "achievements.panierEclair.label",
    description: "Génère 4 listes de courses.",
    descriptionKey: "achievements.panierEclair.description",
    isUnlocked: (s) => s.listsGenerated >= 4,
  },
  {
    id: "habitue",
    icon: "📅",
    label: "L'habitué·e",
    labelKey: "achievements.habitue.label",
    description: "Génère 10 listes de courses.",
    descriptionKey: "achievements.habitue.description",
    isUnlocked: (s) => s.listsGenerated >= 10,
  },
  {
    id: "petite-serie",
    icon: "🔥",
    label: "Sur la lancée",
    labelKey: "achievements.petiteSerie.label",
    description: "Reste dans le budget 3 semaines de suite.",
    descriptionKey: "achievements.petiteSerie.description",
    isUnlocked: (s) => s.streakWeeks >= 3,
  },
  {
    id: "grande-serie",
    icon: "🏆",
    label: "Discipline de fer",
    labelKey: "achievements.grandeSerie.label",
    description: "Reste dans le budget 8 semaines de suite.",
    descriptionKey: "achievements.grandeSerie.description",
    isUnlocked: (s) => s.streakWeeks >= 8,
  },
  {
    id: "cuisinier-debutant",
    icon: "🍳",
    label: "Apprenti cuisinier",
    labelKey: "achievements.cuisinierDebutant.label",
    description: "Essaie 5 recettes différentes.",
    descriptionKey: "achievements.cuisinierDebutant.description",
    isUnlocked: (s) => s.recipesTried >= 5,
  },
  {
    id: "cuisinier-chevronne",
    icon: "👨‍🍳",
    label: "Chef confirmé",
    labelKey: "achievements.cuisinierChevronne.label",
    description: "Essaie 10 recettes différentes.",
    descriptionKey: "achievements.cuisinierChevronne.description",
    isUnlocked: (s) => s.recipesTried >= 10,
  },
  {
    id: "liste-parfaite",
    icon: "✅",
    label: "Liste parfaite",
    labelKey: "achievements.listeParfaite.label",
    description: "Coche tous les articles d'une liste de courses.",
    descriptionKey: "achievements.listeParfaite.description",
    isUnlocked: (s) => s.listsCompleted >= 1,
  },
];

const SEEN_KEY = "campus-panier-achievements-seen";

function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function getUnlockedAchievements(stats: DashboardStats): Achievement[] {
  return ACHIEVEMENTS.filter((achievement) => achievement.isUnlocked(stats));
}

// Badges débloqués mais jamais encore "vus" (célébrés à l'écran) —
// permet de ne montrer l'animation de déblocage qu'une seule fois.
export function getNewlyUnlockedAchievements(
  stats: DashboardStats
): Achievement[] {
  const seen = new Set(readSeen());
  return getUnlockedAchievements(stats).filter(
    (achievement) => !seen.has(achievement.id)
  );
}

export function markAchievementsSeen(stats: DashboardStats): void {
  if (typeof window === "undefined") return;
  const unlockedIds = getUnlockedAchievements(stats).map((a) => a.id);
  window.localStorage.setItem(SEEN_KEY, JSON.stringify(unlockedIds));
}
