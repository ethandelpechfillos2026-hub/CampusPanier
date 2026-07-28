import { ShoppingListResult } from "@/lib/types";

// Client-side only, same lightweight localStorage pattern as favorites.ts.
// Tracks list-generation history (for savings/streak) and which recipes the
// user has opened (for "recettes essayées") to power the rewards dashboard.
const HISTORY_KEY = "campus-panier-list-history";
const RECIPES_VIEWED_KEY = "campus-panier-recipes-viewed";
const MAX_HISTORY = 52; // roughly a year of weekly lists

interface ListHistoryEntry {
  timestamp: number;
  budget: number;
  total: number;
  isOverBudget: boolean;
}

function readHistory(): ListHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ListHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: ListHistoryEntry[]): void {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export function recordListGenerated(result: ShoppingListResult): void {
  if (typeof window === "undefined") return;
  const history = readHistory();
  history.push({
    timestamp: Date.now(),
    budget: result.budget,
    total: result.total,
    isOverBudget: result.isOverBudget,
  });
  writeHistory(history.slice(-MAX_HISTORY));
}

function readViewedRecipes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECIPES_VIEWED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function recordRecipeViewed(recipeId: string): void {
  if (typeof window === "undefined") return;
  const viewed = new Set(readViewedRecipes());
  if (viewed.has(recipeId)) return;
  viewed.add(recipeId);
  window.localStorage.setItem(
    RECIPES_VIEWED_KEY,
    JSON.stringify(Array.from(viewed))
  );
}

export interface DashboardStats {
  streakWeeks: number;
  savedThisMonth: number;
  listsGenerated: number;
  recipesTried: number;
}

export function getDashboardStats(): DashboardStats {
  const history = readHistory();
  const viewed = readViewedRecipes();

  // Consecutive under-budget lists, most recent first.
  let streakWeeks = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].isOverBudget) break;
    streakWeeks += 1;
  }

  const now = new Date();
  const savedThisMonth = history
    .filter((entry) => {
      const d = new Date(entry.timestamp);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, entry) => {
      const saved = entry.budget - entry.total;
      return saved > 0 ? sum + saved : sum;
    }, 0);

  return {
    streakWeeks,
    savedThisMonth: Math.round(savedThisMonth * 100) / 100,
    listsGenerated: history.length,
    recipesTried: viewed.length,
  };
}
