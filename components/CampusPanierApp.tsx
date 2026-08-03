"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import BudgetStep from "@/components/BudgetStep";
import MenuContent from "@/components/MenuContent";
import ProfileForm from "@/components/ProfileForm";
import RecipesContent from "@/components/RecipesContent";
import ResultsContent from "@/components/ResultsContent";
import SharedListTab from "@/components/SharedListTab";
import SignIn from "@/components/SignIn";
import { getCloudProfile, saveCloudProfile } from "@/lib/authProfile";
import { addFavorite, findFavorite, getFavorites, removeFavorite } from "@/lib/favorites";
import { auth } from "@/lib/firebase";
import { generateShoppingList } from "@/lib/generateShoppingList";
import { playClickSound } from "@/lib/sound";
import { recordListGenerated } from "@/lib/stats";
import {
  FavoriteList,
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
        setView(savedProfile ? "budget" : "profile");
      } catch (error) {
        console.error("Erreur de chargement du profil Firestore:", error);
        setProfile(null);
        setView("profile");
      }
      setFavorites(getFavorites());
      setReady(true);
    });

    return () => unsubscribe();
  }, []);

  function generateList(prefs: UserPreferences) {
    const newResult = generateShoppingList(prefs);
    setPreferences(prefs);
    setResult(newResult);
    recordListGenerated(newResult);
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

  function handleRestart() {
    setPreferences(null);
    setResult(null);
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
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-campus-muted underline"
          >
            Se déconnecter
          </button>
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
              />
            )}
            {resultsTab === "menu" && (
              <MenuContent result={result} onRestart={handleRestart} />
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
