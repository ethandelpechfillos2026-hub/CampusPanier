"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import BudgetStep from "@/components/BudgetStep";
import IngredientPickerStep from "@/components/IngredientPickerStep";
import MenuContent from "@/components/MenuContent";
import PathChoiceStep from "@/components/PathChoiceStep";
import ProfileForm from "@/components/ProfileForm";
import RecipesContent from "@/components/RecipesContent";
import ResultsContent from "@/components/ResultsContent";
import SharedListTab from "@/components/SharedListTab";
import SignIn from "@/components/SignIn";
import WeekPlanReview from "@/components/WeekPlanReview";
import {
  getCloudProfile,
  saveCloudProfile,
  updateLastBudget,
  updateProductSubstitutions,
} from "@/lib/authProfile";
import { addFavorite, findFavorite, getFavorites, removeFavorite } from "@/lib/favorites";
import { auth } from "@/lib/firebase";
import {
  applyStoredSubstitutions,
  generateShoppingList,
  recomputeAfterSwap,
  replaceItem,
} from "@/lib/generateShoppingList";
import { useTranslation } from "@/lib/i18n/LanguageContext";
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

// "pathChoice" (Générer ma liste vs Planifier ma semaine), "ingredientPicker"
// (parcours "Je choisis mes ingrédients") et "planReview" (semaine à valider
// avant de rejoindre les onglets Résultats habituels) sont les trois écrans
// du planificateur de repas — voir components/PathChoiceStep.tsx,
// IngredientPickerStep.tsx et WeekPlanReview.tsx. Tout le reste du flux
// (signin/profile/budget/results) reste inchangé, "results" restant la seule
// destination finale, commune aux deux parcours.
type View =
  | "signin"
  | "profile"
  | "budget"
  | "pathChoice"
  | "ingredientPicker"
  | "planReview"
  | "results";
type ResultsTab = "liste" | "menu" | "recettes" | "coloc";

export default function CampusPanierApp() {
  const { t } = useTranslation();
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
  // Ensemble des produits choisis à la main par la personne dans le parcours
  // "Je choisis mes ingrédients" (voir IngredientPickerStep.tsx) — sert à
  // restreindre les remplacements proposés dans "Semaine à valider" au même
  // ensemble d'ingrédients (voir WeekPlanReview.tsx). `undefined` pour tous
  // les autres parcours (liste directe, planification automatique) : aucune
  // restriction, comportement inchangé.
  const [allowedProductIds, setAllowedProductIds] = useState<
    Set<string> | undefined
  >(undefined);

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
          // Reconstruit aussi la restriction d'ingrédients de la dernière
          // génération si elle en avait une (voir lib/types.ts,
          // lastAllowedProductIds) — sans ça, une liste construite via "Je
          // choisis mes ingrédients" se serait vue remplacée par une liste
          // non restreinte à cette reconnexion (retour d'audit, 13 août
          // 2026).
          const lastRestrictTo =
            savedProfile.lastAllowedProductIds &&
            savedProfile.lastAllowedProductIds.length > 0
              ? new Set(savedProfile.lastAllowedProductIds)
              : undefined;
          resumeList(
            { budget: savedProfile.lastBudget, ...savedProfile },
            savedProfile.productSubstitutions,
            lastRestrictTo
          );
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

  // Cœur partagé de toute génération de liste, quel que soit le parcours
  // (reprise de session, liste directe, planification automatique ou à
  // partir d'ingrédients choisis) — un seul endroit qui appelle
  // generateShoppingList/applyStoredSubstitutions, pour ne jamais avoir deux
  // implémentations de "comment on transforme des préférences en liste" qui
  // pourraient diverger. `restrictTo` (optionnel) vient du parcours "Je
  // choisis mes ingrédients" (voir IngredientPickerStep.tsx) — voir
  // lib/generateShoppingList.ts pour ce que ça change dans le moteur.
  function computeAndApplyList(
    prefs: UserPreferences,
    substitutions: Record<string, string> | null,
    restrictTo?: Set<string>
  ): ShoppingListResult {
    const rawResult = generateShoppingList(prefs, restrictTo);
    const items = applyStoredSubstitutions(rawResult.items, substitutions, prefs);
    const newResult =
      items === rawResult.items ? rawResult : recomputeAfterSwap(items, rawResult);
    setPreferences(prefs);
    setResult(newResult);
    setAllowedProductIds(restrictTo);
    setMealsOut([]);
    return newResult;
  }

  // Mémorise cette génération comme une VRAIE action de la personne
  // (historique, stats, dernier budget ET dernière restriction d'ingrédients
  // éventuelle) — factorisé pour être partagé entre les trois façons
  // d'obtenir une liste qui doivent compter (directe, planifiée
  // automatiquement, planifiée à partir d'ingrédients), à la différence de
  // resumeList ci-dessous qui ne doit PAS compter (juste rouvrir l'app sur
  // la dernière liste). `restrictTo`, quand fourni, est aussi persisté :
  // sans ça, une liste construite à partir d'ingrédients choisis se serait
  // vue remplacée par une liste non restreinte à la prochaine connexion —
  // le budget seul ne suffit pas à la reproduire (retour d'audit, 13 août
  // 2026, voir lib/authProfile.ts).
  function finalizeGeneration(
    newResult: ShoppingListResult,
    prefs: UserPreferences,
    restrictTo?: Set<string>
  ) {
    recordListGenerated(newResult);
    const allowedIdsArray = restrictTo ? Array.from(restrictTo) : null;
    // Mémorisé sur le profil Firestore (pas en local) pour que "reconnecte
    // directement sur la liste" fonctionne avec ce compte Google, peu
    // importe l'appareil. On garde aussi `profile` à jour côté client pour
    // qu'une modification de profil juste après ne réécrase pas ce budget
    // avec une valeur périmée (voir handleProfileComplete/ProfileForm).
    if (user) {
      updateLastBudget(user.uid, prefs.budget, allowedIdsArray).catch((error) => {
        console.error("Erreur d'enregistrement du dernier budget:", error);
      });
    }
    setProfile((prev) =>
      prev
        ? { ...prev, lastBudget: prefs.budget, lastAllowedProductIds: allowedIdsArray }
        : prev
    );
  }

  // Reconstruit la dernière liste (même budget, profil à jour, et même
  // restriction d'ingrédients éventuelle — voir `restrictTo`) sans la
  // compter comme une nouvelle génération — sinon rouvrir l'app gonflerait
  // l'historique et les statistiques à chaque fois, sans action réelle de
  // l'utilisateur·rice (voir computeAndApplyList/finalizeGeneration
  // ci-dessus : ici on appelle seulement le premier, jamais le second).
  function resumeList(
    prefs: UserPreferences,
    substitutions: Record<string, string> | null,
    restrictTo?: Set<string>
  ) {
    computeAndApplyList(prefs, substitutions, restrictTo);
    setResultsTab("liste");
    setView("results");
  }

  // `restrictTo` optionnel : `undefined` pour l'option directe (comportement
  // historique), ou repris d'un favori construit à partir d'ingrédients
  // choisis (voir le rendu des favoris plus bas) — jamais utilisé pour une
  // toute nouvelle génération "directe", qui n'a par définition aucune
  // restriction.
  function generateList(
    prefs: UserPreferences,
    substitutions: Record<string, string> | null,
    restrictTo?: Set<string>
  ) {
    const newResult = computeAndApplyList(prefs, substitutions, restrictTo);
    finalizeGeneration(newResult, prefs, restrictTo);
    setResultsTab("liste");
    setView("results");
  }

  async function handleProfileComplete(p: UserProfile) {
    if (!user) return;
    await saveCloudProfile(user.uid, p);
    setProfile(p);
    setView("budget");
  }

  // N'appelle plus generateList directement : le budget est désormais suivi
  // du choix du parcours (voir View, PathChoiceStep.tsx) — "Générer ma
  // liste" (inchangé) ou "Planifier ma semaine" (nouveau, auto ou à partir
  // d'ingrédients choisis). Les préférences sont mémorisées ici, avant même
  // la génération, pour être disponibles sur les écrans du planificateur.
  function handleBudgetSubmit(budget: number) {
    if (!profile) return;
    setPreferences({ budget, ...profile });
    setView("pathChoice");
  }

  // Option 1 : comportement historique, inchangé.
  function handleChoosePathDirect() {
    if (!preferences) return;
    generateList(preferences, profile?.productSubstitutions ?? null);
  }

  // Option 2A : réutilise EXACTEMENT le même moteur que l'option directe
  // (aucune restriction d'ingrédients) — seule différence, la destination :
  // "Semaine à valider" plutôt que directement les onglets Résultats.
  function handleChoosePathAutoPlan() {
    if (!preferences) return;
    const newResult = computeAndApplyList(
      preferences,
      profile?.productSubstitutions ?? null
    );
    finalizeGeneration(newResult, preferences);
    setResultsTab("liste");
    setView("planReview");
  }

  function handleChoosePathIngredients() {
    setView("ingredientPicker");
  }

  // Option 2B : mêmes étapes que 2A, sauf que la génération est restreinte
  // aux produits choisis à la main (voir lib/generateShoppingList.ts,
  // paramètre allowedProductIds) — le budget reste une limite stricte,
  // comme partout ailleurs dans l'app. `selectedIds` est aussi transmis à
  // finalizeGeneration pour être persisté (voir plus haut) : sans ça, se
  // reconnecter ou rappeler cette liste en favori l'aurait silencieusement
  // remplacée par une liste non restreinte.
  function handleIngredientsConfirmed(selectedIds: Set<string>) {
    if (!preferences) return;
    const newResult = computeAndApplyList(
      preferences,
      profile?.productSubstitutions ?? null,
      selectedIds
    );
    finalizeGeneration(newResult, preferences, selectedIds);
    setResultsTab("liste");
    setView("planReview");
  }

  function handleValidateWeekPlan() {
    setView("results");
  }

  // Échange un produit de "Ma liste" contre un autre (bouton "Échanger" du
  // popup produit, voir ResultsContent.tsx) — met à jour la liste affichée
  // ET mémorise l'échange sur le profil Firestore (comme lastBudget), pour
  // qu'il soit réappliqué à la prochaine liste générée ou à la prochaine
  // connexion (voir resumeList/generateList) — retour utilisateur : "je
  // n'aime pas les lentilles" doit rester vrai, pas juste pour la session.
  function handleSwapProduct(oldProductId: string, newProduct: Product) {
    if (!result) return;
    const newItems = replaceItem(result.items, oldProductId, newProduct);
    setResult(recomputeAfterSwap(newItems, result));

    if (user) {
      const updatedSubstitutions = {
        ...(profile?.productSubstitutions ?? {}),
        [oldProductId]: newProduct.id,
      };
      setProfile((prev) =>
        prev ? { ...prev, productSubstitutions: updatedSubstitutions } : prev
      );
      updateProductSubstitutions(user.uid, updatedSubstitutions).catch((error) => {
        console.error("Erreur d'enregistrement de l'échange de produit:", error);
      });
    }
  }

  function handleRestart() {
    setPreferences(null);
    setResult(null);
    setAllowedProductIds(undefined);
    setMealsOut([]);
    setResultsTab("liste");
    setView("budget");
  }

  function handleToggleFavorite() {
    if (!preferences) return;
    // Un favori doit se souvenir de la restriction d'ingrédients éventuelle
    // (voir lib/favorites.ts) — sinon deux listes aux mêmes préférences mais
    // des ingrédients choisis différents seraient vues comme un seul et
    // même favori.
    const allowedIdsArray = allowedProductIds ? Array.from(allowedProductIds) : null;
    const existing = findFavorite(preferences, favorites, allowedIdsArray);
    setFavorites(
      existing
        ? removeFavorite(existing.id)
        : addFavorite(preferences, allowedIdsArray)
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
    ? findFavorite(
        preferences,
        favorites,
        allowedProductIds ? Array.from(allowedProductIds) : null
      )
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
            <p className="text-xs text-campus-muted">{t("app.tagline")}</p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <Link href="/parametres" className="text-xs text-campus-muted underline">
              {t("app.settings")}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-campus-muted underline"
            >
              {t("app.signOut")}
            </button>
          </div>
        )}
      </header>

      {showFavorites && (
        <div className="border-b border-campus-sand/80 px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-campus-muted">
            {t("app.savedListsTitle")}
          </p>
          <div className="flex flex-wrap gap-2">
            {favorites.map((fav) => (
              <button
                key={fav.id}
                type="button"
                onClick={() =>
                  generateList(
                    fav.preferences,
                    profile?.productSubstitutions ?? null,
                    // Reconstruit la restriction d'ingrédients de ce favori
                    // précis, si elle en avait une (voir lib/favorites.ts) —
                    // sinon ce favori régénérerait une liste non restreinte,
                    // différente de celle enregistrée.
                    fav.allowedProductIds && fav.allowedProductIds.length > 0
                      ? new Set(fav.allowedProductIds)
                      : undefined
                  )
                }
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
            {t("app.tabList")}
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
            {t("app.tabMenu")}
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
            {t("app.tabRecipes")}
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
            {t("app.tabRoommates")}
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
        {view === "pathChoice" && preferences && (
          <PathChoiceStep
            onChooseDirect={handleChoosePathDirect}
            onChooseAutoPlan={handleChoosePathAutoPlan}
            onChooseIngredients={handleChoosePathIngredients}
            onEditBudget={() => setView("budget")}
          />
        )}
        {view === "ingredientPicker" && preferences && (
          <IngredientPickerStep
            preferences={preferences}
            onBack={() => setView("pathChoice")}
            onConfirm={handleIngredientsConfirmed}
          />
        )}
        {view === "planReview" && result && preferences && (
          <WeekPlanReview
            result={result}
            preferences={preferences}
            allowedProductIds={allowedProductIds}
            onSwapProduct={handleSwapProduct}
            onValidate={handleValidateWeekPlan}
            onRestart={handleRestart}
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
                userName={user.displayName ?? user.email ?? t("app.youFallback")}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
