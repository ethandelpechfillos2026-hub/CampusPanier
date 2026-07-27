import { DIET_OPTIONS, FavoriteList, UserPreferences } from "@/lib/types";

// Client-side only for now — no account system yet, so "favorites" and
// "recent lists" live in localStorage. This is the natural stepping stone
// toward real accounts later: swap these functions for API calls and the
// rest of the app (components, state shape) doesn't need to change.
const STORAGE_KEY = "campus-panier-favorites";
const MAX_FAVORITES = 6;

function summarize(prefs: UserPreferences): string {
  const dietLabel =
    DIET_OPTIONS.find((option) => option.value === prefs.diet)?.label ??
    prefs.diet;
  return `${prefs.budget} € · ${dietLabel}`;
}

function samePreferences(a: UserPreferences, b: UserPreferences): boolean {
  return (
    a.budget === b.budget &&
    a.diet === b.diet &&
    a.dailyCalories === b.dailyCalories &&
    JSON.stringify([...a.allergies].sort()) ===
      JSON.stringify([...b.allergies].sort()) &&
    JSON.stringify([...a.macroPreferences].sort()) ===
      JSON.stringify([...b.macroPreferences].sort())
  );
}

export function getFavorites(): FavoriteList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteList[]) : [];
  } catch {
    return [];
  }
}

export function findFavorite(
  prefs: UserPreferences,
  favorites: FavoriteList[]
): FavoriteList | undefined {
  return favorites.find((f) => samePreferences(f.preferences, prefs));
}

function persist(favorites: FavoriteList[]): FavoriteList[] {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  return favorites;
}

export function addFavorite(prefs: UserPreferences): FavoriteList[] {
  const favorites = getFavorites();
  if (findFavorite(prefs, favorites)) return favorites;

  const next: FavoriteList = {
    id: `${Date.now()}`,
    label: summarize(prefs),
    preferences: prefs,
    createdAt: Date.now(),
  };

  return persist([next, ...favorites].slice(0, MAX_FAVORITES));
}

export function removeFavorite(id: string): FavoriteList[] {
  return persist(getFavorites().filter((f) => f.id !== id));
}
