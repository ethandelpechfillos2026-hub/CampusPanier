"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import BudgetStep from "@/components/BudgetStep";
import MenuContent from "@/components/MenuContent";
import ProfileForm from "@/components/ProfileForm";
import RecipesContent from "@/components/RecipesContent";
import ResultsContent from "@/components/ResultsContent";
import SharedListTab from "@/components/SharedListTab";
import SignIn from "@/components/SignIn";
import { getCloudProfile, saveCloudProfile, updateLastBudget } from "@/lib/authProfile";
import { addFavorite, findFavorite, getFavorites, removeFavorite } from "@/lib/favorites";
import { auth } from "@/lib/firebase";
import {
  generateShoppingList,
  recomputeAfterSwap,
  replaceItem,
} from "@/lib/generateShoppingList";
import { playClickSound } from "@/lib/sound";
import { recordListGenerated } from "@/lib/stats";
import {
  FavoriteList,
  MealOutEntry,
  Product,
  ShoppingListResult,
  UserPreferences,
  UserProfile,
} from "@/lib/types";

type View = "signin" | "profile" | "budget" | "results";
type ResultsTab = "liste" | "menu" | "recettes" | "coloc";

export default function CampusPanierApp() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("signin");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resultsTab, setResultsTab] = useState<ResultsTab>("liste");
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [result, setResult] = useState<ShoppingListResult | null>(null);
  const [favorites, setFavorites] = useState<FavoriteList[]>([]);
  // Journal des repas mangés dehors de façon imprévue cette semaine — élevé
  // ici (plutôt que dans MenuContent) pour survivre aux changements d'onglet
  // ("Ma liste" ↔ "Mon menu"), et remis à zéro à chaque nouvelle liste
  // générée (nouvelle semaine).
  const [mealsOut, setMealsOut] = useState<MealOutEntry[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setView("signin");
        setReady(true);
        return;
      }

      try {
        const savedProfile = await getCloudProfile(firebaseUser.uid);
        setProfile(savedProfile);
        // Retombe directement sur "Ma liste" avec la dernière liste générée
        // plutôt que sur l'écran budget — retour utilisateur : ce
        // comportement doit suivre le compte Google connecté, pas
        // l'appareil. Le budget mémorisé (lastBudget) vient donc du profil
        // Firestore, pas d'un cache local ; le reste des préférences vient
        // toujours du profil à jour, jamais d'une copie figée, pour refléter
        // un éventuel changement de profil fait entre-temps. Première
        // connexion (jamais de liste générée) : onboarding puis écran
        // budget comme avant.
        if (savedProfile && savedProfile.lastBudget !== null) {
          resumeList({ budget: savedProfile.lastBudget, ...savedProfile });
        } else {
          setView(savedProfile ? "budget" : "profile");
        }
      } catch (error) {
        console.error("Erreur de chargement du profil Firestore:", error);
        setProfile(null);
        setView("profile");
      }
      setFavorites(getFavorites());
      setReady(true);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconstruit la dernière liste (même budget, profil à jour) sans la
  // compter comme une nouvelle génération — sinon rouvrir l'app gonflerait
  // l'historique et les statistiques à chaque fois, sans action réelle de
  // l'utilisateur·rice.
  function resumeList(prefs: UserPreferences) {
    const newResult = generateShoppingList(prefs);
    setPreferences(prefs);
    setResult(newResult);
    setMealsOut([]);
    setResultsTab("liste");
    setView("results");
  }

  function generateList(prefs: UserPreferences) {
    const newResult = generateShoppingList(prefs);
    setPreferences(prefs);
    setResult(newResult);
    setMealsOut([]);
    recordListGenerated(newResult);
    // Mémorisé sur le profil Firestore (pas en local) pour que "reconnecte
    // directement sur la liste" fonctionne avec ce compte Google, peu
    // importe l'appareil. On garde aussi `profile` à jour côté client pour
    // qu'une modification de profil juste après ne réécrase pas ce budget
    // avec une valeur périmée (voir handleProfileComplete/ProfileForm).
    if (user) {
      updateLastBudget(user.uid, prefs.budget).catch((error) => {
        console.error("Erreur d'enregistrement du dernier budget:", error);
      });
    }
    setProfile((prev) => (prev ? { ...prev, lastBudget: prefs.budget } : prev));
    setResultsTab("liste");
    setView("results");
  }

  async function handleProfileComplete(p: UserProfile) {
    if (!user) return;
    await saveCloudProfile(user.uid, p);
    setProfile(p);
    setView("budget");
  }

  function handleBudgetSubmit(budget: number) {
    if (!profile) return;
    generateList({ budget, ...profile });
  }

  // Échange un produit de "Ma liste" contre un autre (bouton "Échanger" du
  // popup produit, voir ResultsContent.tsx) — ne touche ni les préférences
  // ni le budget saisi, juste le contenu de la liste déjà générée. Comme
  // "resumeList", n'est pas persisté sur le profil : rouvrir l'app ou faire
  // "Refaire" régénère la liste à partir du profil/budget, sans garder les
  // échanges faits à la main (limite connue, à améliorer plus tard si
  // besoin).
  function handleSwapProduct(oldProductId: string, newProduct: Product) {
    if (!result) return;
    const newItems = replaceItem(result.items, oldProductId, newProduct);
    setResult(recomputeAfterSwap(newItems, result));
  }

  function handleRestart() {
    setPreferences(null);
    setResult(null);
    setMealsOut([]);
    setResultsTab("liste");
    setView("budget");
  }

  function handleToggleFavorite() {
    if (!preferences) return;
    const existing = findFavorite(preferences, favorites);
    setFavorites(
      existing ? removeFavorite(existing.id) : addFavorite(preferences)
    );
  }

  function handleSignOut() {
    signOut(auth);
  }

  // Petit clic satisfaisant sur chaque bouton de l'app — délégation
  // d'événement au niveau racine, pas besoin de le câbler bouton par bouton.
  function handleGlobalClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      playClickSound();
    }
  }

  if (!ready) return null;

  const showTabs = view === "results" && result && preferences;
  const currentFavorite = preferences
    ? findFavorite(preferences, favorites)
    : undefined;
  const showFavorites = (view === "profile" || view === "budget") && favorites.length > 0;

  return (
    <div
      onClickCapture={handleGlobalClick}
      className="flex min-h-full flex-1 flex-col"
    >
      <header className="flex items-center justify-between border-b border-campus-sand/80 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-campus-terracotta text-lg text-white">
            🛒
          </span>
          <div>
            <p className="text-base font-bold leading-tight text-campus-ink">
              CampusPanier
            </p>
            <p className="text-xs text-campus-muted">Courses étudiant·es</p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <Link href="/parametres" className="text-xs text-campus-muted underline">
              Réglages
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-campus-muted underline"
            >
              Se déconnecter
            </button>
          </div>
        )}
      </header>

      {showFavorites && (
        <div className="border-b border-campus-sand/80 px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-campus-muted">
            Refaire une liste enregistrée
          </p>
          <div className="flex flex-wrap gap-2">
            {favorites.map((fav) => (
              <button
                key={fav.id}
                type="button"
                onClick={() => generateList(fav.preferences)}
                className="chip chip-default"
              >
                ★ {fav.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showTabs && (
        <div className="flex border-b border-campus-sand/80 px-5">
          <button
            type="button"
            onClick={() => setResultsTab("liste")}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
              resultsTab === "liste"
                ? "border-campus-terracotta text-campus-terracotta"
                : "border-transparent text-campus-muted"
            }`}
          >
            Ma liste
          </button>
          <button
            type="button"
            onClick={() => setResultsTab("menu")}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
              resultsTab === "menu"
                ? "border-campus-terracotta text-campus-terracotta"
                : "border-transparent text-campus-muted"
            }`}
          >
            Mon menu
          </button>
          <button
            type="button"
            onClick={() => setResultsTab("recettes")}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
              resultsTab === "recettes"
                ? "border-campus-terracotta text-campus-terracotta"
                : "border-transparent text-campus-muted"
            }`}
          >
            Mes recettes
          </button>
          <button
            type="button"
            onClick={() => setResultsTab("coloc")}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
              resultsTab === "coloc"
                ? "border-campus-terracotta text-campus-terracotta"
                : "border-transparent text-campus-muted"
            }`}
          >
            👥 Coloc
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {view === "signin" && <SignIn />}
        {view === "profile" && (
          <ProfileForm onComplete={handleProfileComplete} initialProfile={profile} />
        )}
        {view === "budget" && (
          <BudgetStep
            onSubmit={handleBudgetSubmit}
            onEditProfile={() => setView("profile")}
          />
        )}
        {view === "results" && result && preferences && (
          <>
            {resultsTab === "liste" && (
              <ResultsContent
                result={result}
                preferences={preferences}
                onRestart={handleRestart}
                isFavorited={Boolean(currentFavorite)}
                onToggleFavorite={handleToggleFavorite}
                onSwapProduct={handleSwapProduct}
              />
            )}
            {resultsTab === "menu" && (
              <MenuContent
                result={result}
                preferences={preferences}
                onRestart={handleRestart}
                mealsOut={mealsOut}
                onMealsOutChange={setMealsOut}
              />
            )}
            {resultsTab === "recettes" && (
              <RecipesContent
                result={result}
                preferences={preferences}
                onRestart={handleRestart}
              />
            )}
            {resultsTab === "coloc" && user && (
              <SharedListTab
                result={result}
                userId={user.uid}
                userName={user.displayName ?? user.email ?? "Toi"}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
