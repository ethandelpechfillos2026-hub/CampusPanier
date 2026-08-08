// Se souvient du dernier budget utilisé pour générer une liste — sert
// uniquement à retomber directement sur "Ma liste" au prochain lancement de
// l'app plutôt que sur l'écran budget (voir CampusPanierApp.tsx). Le reste
// des préférences (régime, allergies, calories...) vient toujours du profil
// à jour, jamais d'une copie figée ici, pour ne jamais afficher une liste
// qui ignorerait un changement de profil fait entre-temps.
const LAST_BUDGET_KEY = "campus-panier-last-budget";

export function getLastBudget(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_BUDGET_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveLastBudget(budget: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_BUDGET_KEY, String(budget));
}

export function clearLastBudget(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_BUDGET_KEY);
}
