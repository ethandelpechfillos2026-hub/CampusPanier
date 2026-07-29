import { DashboardStats } from "@/lib/stats";

// Système de points/niveaux, dérivé uniquement des stats déjà trackées —
// pas de nouveau stockage nécessaire. Barème volontairement simple et
// généreux : chaque action (générer une liste, essayer une recette, tenir
// son budget une semaine, cocher toute une liste) rapporte des points.
const XP_PER_LIST = 15;
const XP_PER_RECIPE = 10;
const XP_PER_STREAK_WEEK = 20;
const XP_PER_COMPLETED_LIST = 25;

export function computeXp(stats: DashboardStats): number {
  return (
    stats.listsGenerated * XP_PER_LIST +
    stats.recipesTried * XP_PER_RECIPE +
    stats.streakWeeks * XP_PER_STREAK_WEEK +
    stats.listsCompleted * XP_PER_COMPLETED_LIST
  );
}

interface LevelMeta {
  title: string;
  icon: string;
}

const BASE_LEVELS: LevelMeta[] = [
  { title: "Étudiant curieux", icon: "🌱" },
  { title: "Étudiant organisé", icon: "📝" },
  { title: "Étudiant économe", icon: "💰" },
  { title: "Chef de placard", icon: "🥘" },
  { title: "Maître du panier", icon: "🛒" },
  { title: "Légende du batch cooking", icon: "👑" },
];

// XP requis pour ATTEINDRE chaque niveau de base (index 0 = niveau 1).
const FIRST_LEVEL_XP = [0, 50, 150, 300, 500, 800];
const XP_PER_EXTRA_LEVEL = 400;

function levelStartXp(level: number): number {
  const idx = level - 1;
  if (idx < FIRST_LEVEL_XP.length) return FIRST_LEVEL_XP[idx];
  const extraLevels = idx - (FIRST_LEVEL_XP.length - 1);
  return (
    FIRST_LEVEL_XP[FIRST_LEVEL_XP.length - 1] + extraLevels * XP_PER_EXTRA_LEVEL
  );
}

function levelMeta(level: number): LevelMeta {
  const idx = Math.min(level - 1, BASE_LEVELS.length - 1);
  const meta = BASE_LEVELS[idx];
  return level > BASE_LEVELS.length
    ? { title: `${meta.title} (niv. ${level})`, icon: meta.icon }
    : meta;
}

export interface LevelInfo {
  level: number;
  title: string;
  icon: string;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

export function getLevelInfo(xp: number): LevelInfo {
  let level = 1;
  while (levelStartXp(level + 1) <= xp) level += 1;

  const meta = levelMeta(level);
  const currentStart = levelStartXp(level);
  const nextStart = levelStartXp(level + 1);
  const xpIntoLevel = xp - currentStart;
  const xpForNextLevel = nextStart - currentStart;

  return {
    level,
    title: meta.title,
    icon: meta.icon,
    xp,
    xpIntoLevel,
    xpForNextLevel,
    progressPercent: Math.min(
      100,
      Math.round((xpIntoLevel / xpForNextLevel) * 100)
    ),
  };
}
