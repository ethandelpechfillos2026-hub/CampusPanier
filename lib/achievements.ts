import { DashboardStats } from "@/lib/stats";

export interface Achievement {
  id: string;
  icon: string;
  label: string;
  description: string;
  isUnlocked: (stats: DashboardStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "premier-panier",
    icon: "🛒",
    label: "Premier panier",
    description: "Génère ta toute première liste de courses.",
    isUnlocked: (s) => s.listsGenerated >= 1,
  },
  {
    id: "panier-eclair",
    icon: "⚡",
    label: "Panier éclair",
    description: "Génère 4 listes de courses.",
    isUnlocked: (s) => s.listsGenerated >= 4,
  },
  {
    id: "habitue",
    icon: "📅",
    label: "L'habitué·e",
    description: "Génère 10 listes de courses.",
    isUnlocked: (s) => s.listsGenerated >= 10,
  },
  {
    id: "petite-serie",
    icon: "🔥",
    label: "Sur la lancée",
    description: "Reste dans le budget 3 semaines de suite.",
    isUnlocked: (s) => s.streakWeeks >= 3,
  },
  {
    id: "grande-serie",
    icon: "🏆",
    label: "Discipline de fer",
    description: "Reste dans le budget 8 semaines de suite.",
    isUnlocked: (s) => s.streakWeeks >= 8,
  },
  {
    id: "cuisinier-debutant",
    icon: "🍳",
    label: "Apprenti cuisinier",
    description: "Essaie 5 recettes différentes.",
    isUnlocked: (s) => s.recipesTried >= 5,
  },
  {
    id: "cuisinier-chevronne",
    icon: "👨‍🍳",
    label: "Chef confirmé",
    description: "Essaie 10 recettes différentes.",
    isUnlocked: (s) => s.recipesTried >= 10,
  },
  {
    id: "liste-parfaite",
    icon: "✅",
    label: "Liste parfaite",
    description: "Coche tous les articles d'une liste de courses.",
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
