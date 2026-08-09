"use client";

import Link from "next/link";
import { useState } from "react";
import { computeMacroTargets } from "@/lib/macros";
import {
  AGE_DEFAULT,
  AGE_MAX,
  AGE_MIN,
  ALLERGEN_OPTIONS,
  CALORIE_DEFAULT,
  CALORIE_MAX,
  CALORIE_MIN,
  CALORIE_STEP,
  DIET_OPTIONS,
  ENSEIGNE_OPTIONS,
  GLUCIDES_G_MAX,
  GLUCIDES_G_MIN,
  HEIGHT_DEFAULT,
  HEIGHT_MAX,
  HEIGHT_MIN,
  LIPIDES_G_MAX,
  LIPIDES_G_MIN,
  MACRO_OPTIONS,
  PROTEIN_G_MAX,
  PROTEIN_G_MIN,
  SEX_OPTIONS,
  UserProfile,
  WEIGHT_DEFAULT,
  WEIGHT_MAX,
  WEIGHT_MIN,
} from "@/lib/types";

// Jours sélectionnables pour la cantine — 0 = lundi ... 4 = vendredi,
// convention partagée avec generateMenu.ts (WEEKDAY_LABELS).
const CANTEEN_DAY_OPTIONS = [
  { value: 0, label: "Lun" },
  { value: 1, label: "Mar" },
  { value: 2, label: "Mer" },
  { value: 3, label: "Jeu" },
  { value: 4, label: "Ven" },
];

const STEPS = [
  { id: 1, title: "Alimentation", subtitle: "Quel est ton type d'alimentation ?" },
  { id: 2, title: "Allergies", subtitle: "As-tu des allergies alimentaires ?" },
  { id: 3, title: "Calories", subtitle: "Un repère quotidien, si tu le connais" },
  { id: 4, title: "Préférences", subtitle: "Coche ce qui compte pour toi" },
];

interface ProfileFormProps {
  onComplete: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

export default function ProfileForm({ onComplete, initialProfile }: ProfileFormProps) {
  const [step, setStep] = useState(1);
  const [diet, setDiet] = useState<UserProfile["diet"]>(initialProfile?.diet ?? "omnivore");
  const [allergies, setAllergies] = useState<UserProfile["allergies"]>(
    initialProfile?.allergies ?? []
  );
  const [calorieMode, setCalorieMode] = useState<"unknown" | "custom">(
    initialProfile?.dailyCalories ? "custom" : "unknown"
  );
  const [caloriesValue, setCaloriesValue] = useState(
    initialProfile?.dailyCalories ?? CALORIE_DEFAULT
  );
  const [macroPreferences, setMacroPreferences] = useState<UserProfile["macroPreferences"]>(
    initialProfile?.macroPreferences ?? []
  );
  const [sex, setSex] = useState<UserProfile["sex"]>(initialProfile?.sex ?? null);
  const [weightKg, setWeightKg] = useState(initialProfile?.weightKg ?? WEIGHT_DEFAULT);
  const [heightCm, setHeightCm] = useState(initialProfile?.heightCm ?? HEIGHT_DEFAULT);
  const [age, setAge] = useState(initialProfile?.age ?? AGE_DEFAULT);
  // Objectifs macro fixés à la main — pour les sportif·ves/pratiques
  // avisé·es qui préfèrent viser un chiffre précis (ex : 50 g de lipides)
  // plutôt que le calcul automatique à partir du profil corporel.
  const [customMacros, setCustomMacros] = useState(Boolean(initialProfile?.macroOverride));
  const [proteinOverride, setProteinOverride] = useState(
    initialProfile?.macroOverride?.proteinG ?? 120
  );
  const [lipidesOverride, setLipidesOverride] = useState(
    initialProfile?.macroOverride?.lipidesG ?? 70
  );
  const [glucidesOverride, setGlucidesOverride] = useState(
    initialProfile?.macroOverride?.glucidesG ?? 250
  );
  // Mode Performance (sportif·ves) : calories obligatoires, objectif prise
  // de masse/sèche + belle peau ajoutés automatiquement, uniquement des
  // produits bruts/peu transformés.
  const [performanceMode, setPerformanceMode] = useState(
    initialProfile?.performanceMode ?? false
  );
  const [performanceObjective, setPerformanceObjective] = useState<
    "prise-masse" | "seche"
  >(initialProfile?.macroPreferences.includes("seche") ? "seche" : "prise-masse");
  // Jours où l'étudiant·e mange à la cantine le midi — variable d'une
  // personne à l'autre (ex : pas le mercredi). Réduit les courses
  // "déjeuner-dîner" prévues à la maison ces jours-là (voir
  // generateShoppingList.ts) et met tout au dîner dans "Mon menu" (voir
  // generateMenu.ts), pour éviter les restes non consommés.
  const [canteenDays, setCanteenDays] = useState<number[]>(
    initialProfile?.canteenDays ?? []
  );

  // Consentement explicite RGPD (article 9) — requis avant de saisir régime,
  // allergies, poids, taille, âge ou objectifs caloriques, qui peuvent
  // révéler des informations de santé ou de convictions (ex : "sans porc").
  // Recueilli une seule fois : si déjà donné (profil existant), on ne le
  // redemande pas à chaque modification, mais on ne l'invente jamais pour un
  // profil qui ne l'a pas (voir migration défensive dans authProfile.ts).
  const [healthConsent, setHealthConsent] = useState(
    initialProfile?.healthConsent ?? false
  );
  const [healthConsentAt, setHealthConsentAt] = useState<string | null>(
    initialProfile?.healthConsentAt ?? null
  );
  const [consentError, setConsentError] = useState(false);

  function toggleHealthConsent() {
    setConsentError(false);
    setHealthConsent((prev) => {
      const next = !prev;
      if (next && !healthConsentAt) {
        setHealthConsentAt(new Date().toISOString());
      }
      return next;
    });
  }

  function toggleCanteenDay(day: number) {
    setCanteenDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  // Enseigne/ville où la personne fait ses courses — optionnel, sert à
  // préférer un relevé de prix de cette enseigne quand le catalogue en a un
  // (voir lib/generateShoppingList.ts). "Peu importe" = null, comportement
  // par défaut inchangé.
  const [preferredEnseigne, setPreferredEnseigne] = useState<string | null>(
    initialProfile?.preferredEnseigne ?? null
  );
  const [preferredZone, setPreferredZone] = useState(
    initialProfile?.preferredZone ?? ""
  );

  // L'étape "Préférences" (riche en protéines, recettes faciles, prise de
  // masse...) ne s'affiche que pour qui ne précise pas de calories exactes
  // ("peu importe") — retour utilisateur : donner à la fois un objectif
  // calorique précis ET des préférences qualitatives vagues est
  // contradictoire. Le Mode Performance force toujours calorieMode="custom"
  // et fixe déjà ses propres préférences automatiquement (voir
  // applyPerformanceMacros), donc il n'a de toute façon pas besoin de cette
  // étape.
  const totalSteps = calorieMode === "custom" ? STEPS.length - 1 : STEPS.length;
  const currentStep = STEPS[step - 1];
  const computedMacroTargets =
    calorieMode === "custom"
      ? computeMacroTargets(
          {
            sex,
            weightKg,
            heightCm,
            age,
            macroOverride: null,
            performanceMode,
            canteenDays,
            preferredEnseigne,
            preferredZone: preferredZone || null,
          },
          caloriesValue
        )
      : null;
  // Identité calorique : 1 g de protéines/glucides = 4 kcal, 1 g de
  // lipides = 9 kcal. Dès que la personne ajuste les grammes à la main, le
  // total de calories affiché doit suivre — sinon les deux chiffres se
  // contredisent (ex : elle baisse les lipides mais "2200 kcal" reste
  // affiché comme si de rien n'était).
  const derivedCalories =
    proteinOverride * 4 + lipidesOverride * 9 + glucidesOverride * 4;
  const macroTargets = customMacros
    ? {
        calories: derivedCalories,
        proteinG: proteinOverride,
        lipidesG: lipidesOverride,
        glucidesG: glucidesOverride,
      }
    : computedMacroTargets;

  function enableCustomMacros() {
    if (computedMacroTargets) {
      setProteinOverride(computedMacroTargets.proteinG);
      setLipidesOverride(computedMacroTargets.lipidesG);
      setGlucidesOverride(computedMacroTargets.glucidesG);
    }
    setCustomMacros(true);
  }

  // Impose l'objectif (prise de masse OU sèche, jamais les deux) et "belle
  // peau" dans les préférences — sans effacer d'autres préférences déjà
  // cochées à la main.
  function applyPerformanceMacros(objective: "prise-masse" | "seche") {
    setMacroPreferences((prev): UserProfile["macroPreferences"] => {
      const withoutObjectives = prev.filter(
        (m) => m !== "prise-masse" && m !== "seche"
      );
      const withBellePeau: UserProfile["macroPreferences"] =
        withoutObjectives.includes("belle-peau")
          ? withoutObjectives
          : [...withoutObjectives, "belle-peau"];
      return [...withBellePeau, objective];
    });
  }

  function togglePerformanceMode() {
    const next = !performanceMode;
    setPerformanceMode(next);
    if (next) {
      // Calories obligatoires en Mode Performance.
      setCalorieMode("custom");
      applyPerformanceMacros(performanceObjective);
    }
  }

  function selectPerformanceObjective(objective: "prise-masse" | "seche") {
    setPerformanceObjective(objective);
    applyPerformanceMacros(objective);
  }

  function toggleAllergy(allergen: UserProfile["allergies"][number]) {
    setAllergies((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  }

  function toggleMacro(macro: UserProfile["macroPreferences"][number]) {
    setMacroPreferences((prev) =>
      prev.includes(macro) ? prev.filter((m) => m !== macro) : [...prev, macro]
    );
  }

  function handleNext() {
    if (step === 1 && !healthConsent) {
      setConsentError(true);
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    const bodyStatsComplete = calorieMode === "custom" && sex !== null;

    onComplete({
      diet,
      allergies,
      dailyCalories:
        calorieMode === "custom"
          ? customMacros
            ? derivedCalories
            : caloriesValue
          : null,
      macroPreferences,
      sex: bodyStatsComplete ? sex : null,
      weightKg: bodyStatsComplete ? weightKg : null,
      heightCm: bodyStatsComplete ? heightCm : null,
      age: bodyStatsComplete ? age : null,
      macroOverride:
        bodyStatsComplete && customMacros
          ? {
              proteinG: proteinOverride,
              lipidesG: lipidesOverride,
              glucidesG: glucidesOverride,
            }
          : null,
      performanceMode,
      canteenDays,
      preferredEnseigne,
      preferredZone: preferredZone || null,
      healthConsent,
      healthConsentAt,
      // Ce formulaire ne gère jamais le budget lui-même (BudgetStep s'en
      // charge après) — on se contente de reporter la valeur déjà connue du
      // profil (préservée telle quelle si la personne modifie son profil
      // plus tard), `null` pour un tout premier profil.
      lastBudget: initialProfile?.lastBudget ?? null,
      // Idem pour les échanges de produits mémorisés (voir
      // ResultsContent.tsx) — ce formulaire ne les modifie jamais, juste
      // les reporter tels quels.
      productSubstitutions: initialProfile?.productSubstitutions ?? null,
      // Idem pour le thème/la langue (voir app/parametres/page.tsx) — ce
      // formulaire ne les modifie jamais non plus.
      theme: initialProfile?.theme ?? null,
      language: initialProfile?.language ?? null,
    });
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-campus-muted">
          Étape {step} sur {totalSteps}
        </p>
        <div className="mt-3 flex gap-1.5">
          {STEPS.slice(0, totalSteps).map((s) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s.id <= step ? "bg-campus-terracotta" : "bg-campus-sand"
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-campus-ink">{currentStep.title}</h1>
        <p className="mt-1 text-sm text-campus-muted">{currentStep.subtitle}</p>
      </div>

      <div className="flex-1">
        {step === 1 && (
          <div className="space-y-5">
            <div className="rounded-2xl border-2 border-campus-sand bg-campus-surface p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={healthConsent}
                  onChange={toggleHealthConsent}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-campus-terracotta"
                />
                <span className="text-xs leading-relaxed text-campus-muted">
                  J&apos;accepte que CampusPanier enregistre les informations
                  de mon profil (régime, allergies, poids, taille, âge,
                  objectifs caloriques) pour personnaliser mes listes de
                  courses et recettes. Ces informations peuvent révéler des
                  données de santé ou des convictions au sens du RGPD — elles
                  ne sont utilisées que pour cette finalité, jamais vendues ni
                  utilisées à des fins publicitaires. Voir notre{" "}
                  <Link
                    href="/confidentialite"
                    target="_blank"
                    className="font-semibold text-campus-terracotta underline"
                  >
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
              {consentError && (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  Coche cette case pour continuer — c&apos;est nécessaire
                  avant de renseigner ces informations.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DIET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDiet(option.value)}
                  className={`diet-btn ${
                    diet === option.value ? "diet-btn-selected" : "diet-btn-default"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border-2 border-campus-terracotta/30 bg-campus-terracotta/5 p-4">
              <p className="text-sm font-bold text-campus-ink">
                🍽️ Cantine le midi
              </p>
              <p className="mt-0.5 text-xs text-campus-muted">
                Coche les jours où tu manges à la cantine — on réduit les
                courses prévues pour le déjeuner à la maison ces jours-là,
                pour éviter les restes en fin de semaine.
              </p>
              <div className="mt-3 flex gap-1.5">
                {CANTEEN_DAY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleCanteenDay(option.value)}
                    aria-pressed={canteenDays.includes(option.value)}
                    className={`flex-1 rounded-full px-2 py-2 text-xs font-bold transition-colors ${
                      canteenDays.includes(option.value)
                        ? "bg-campus-terracotta text-white"
                        : "bg-campus-surface text-campus-ink border-2 border-campus-sand"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-campus-terracotta/30 bg-campus-terracotta/5 p-4">
              <p className="text-sm font-bold text-campus-ink">
                🏬 Ton enseigne (optionnel)
              </p>
              <p className="mt-0.5 text-xs text-campus-muted">
                Quand on a un relevé de prix pour cette enseigne, on le
                préfère à l&apos;estimation générique. Sinon, rien ne change.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreferredEnseigne(null)}
                  aria-pressed={preferredEnseigne === null}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    preferredEnseigne === null
                      ? "bg-campus-terracotta text-white"
                      : "bg-campus-surface text-campus-ink border-2 border-campus-sand"
                  }`}
                >
                  Peu importe
                </button>
                {ENSEIGNE_OPTIONS.map((enseigne) => (
                  <button
                    key={enseigne}
                    type="button"
                    onClick={() => setPreferredEnseigne(enseigne)}
                    aria-pressed={preferredEnseigne === enseigne}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      preferredEnseigne === enseigne
                        ? "bg-campus-terracotta text-white"
                        : "bg-campus-surface text-campus-ink border-2 border-campus-sand"
                    }`}
                  >
                    {enseigne}
                  </button>
                ))}
              </div>
              {preferredEnseigne && (
                <input
                  type="text"
                  value={preferredZone}
                  onChange={(e) => setPreferredZone(e.target.value)}
                  placeholder="Ta ville (optionnel)"
                  className="mt-3 w-full rounded-xl border-2 border-campus-sand px-3 py-2 text-sm"
                />
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {/* Disposition en 2 colonnes plutôt qu'en bulles à la ligne :
                avec 14 allergènes (liste officielle UE des allergènes à
                déclaration obligatoire) plutôt que 5, un flux de bulles
                devenait long et peu lisible à parcourir. */}
            <div className="grid grid-cols-2 gap-2">
              {ALLERGEN_OPTIONS.map((option) => {
                const selected = allergies.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleAllergy(option.value)}
                    aria-pressed={selected}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      selected
                        ? "border-campus-terracotta bg-campus-terracotta/10 text-campus-terracotta"
                        : "border-campus-sand bg-campus-surface text-campus-ink hover:border-campus-terracotta/50"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 text-[10px] font-bold ${
                        selected
                          ? "border-campus-terracotta bg-campus-terracotta text-white"
                          : "border-campus-sand"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <span className="leading-tight">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm leading-relaxed text-campus-muted">
              Optionnel — aucune sélection si tu n&apos;as pas d&apos;allergie.
            </p>
            <p className="text-xs leading-relaxed text-campus-muted">
              On écarte les produits dont l&apos;ingrédient principal
              correspond à ce que tu coches ici. En cas d&apos;allergie
              sévère, vérifie toujours l&apos;étiquette du produit toi-même —
              on ne peut pas garantir la détection des traces ou des
              ingrédients cachés dans les plats préparés.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-campus-terracotta/30 bg-campus-terracotta/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-campus-ink">
                    🏆 Mode Performance
                  </p>
                  <p className="mt-0.5 text-xs text-campus-muted">
                    Pour les sportif·ves : calories obligatoires, objectif
                    prise de masse/sèche, et uniquement des aliments bruts
                    (sans produits ultra-transformés).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={togglePerformanceMode}
                  aria-pressed={performanceMode}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    performanceMode
                      ? "bg-campus-terracotta text-white"
                      : "bg-campus-surface text-campus-ink border-2 border-campus-sand"
                  }`}
                >
                  {performanceMode ? "Activé" : "Activer"}
                </button>
              </div>

              {performanceMode && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-campus-muted">
                    Ton objectif
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectPerformanceObjective("prise-masse")}
                      className={`btn-shortcut flex-1 ${
                        performanceObjective === "prise-masse" ? "btn-shortcut-active" : ""
                      }`}
                    >
                      Prise de masse
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPerformanceObjective("seche")}
                      className={`btn-shortcut flex-1 ${
                        performanceObjective === "seche" ? "btn-shortcut-active" : ""
                      }`}
                    >
                      Sèche
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-campus-muted">
                    &quot;Belle peau&quot; est aussi ajoutée automatiquement.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCalorieMode("unknown")}
                disabled={performanceMode}
                className={`btn-shortcut flex-1 ${
                  calorieMode === "unknown" ? "btn-shortcut-active" : ""
                } ${performanceMode ? "cursor-not-allowed opacity-40" : ""}`}
              >
                Peu importe
              </button>
              <button
                type="button"
                onClick={() => setCalorieMode("custom")}
                className={`btn-shortcut flex-1 ${
                  calorieMode === "custom" ? "btn-shortcut-active" : ""
                }`}
              >
                Je précise
              </button>
            </div>
            {performanceMode && (
              <p className="-mt-4 text-xs text-campus-muted">
                Calories obligatoires en Mode Performance.
              </p>
            )}
            {!performanceMode && (
              <p className="-mt-2 text-xs text-campus-muted">
                {calorieMode === "unknown"
                  ? "Une dernière étape suivra pour préciser ce qui compte pour toi (riche en protéines, recettes faciles...)."
                  : "Avec un objectif précis, pas besoin de préférences en plus — l'étape suivante sera la dernière."}
              </p>
            )}

            {calorieMode === "custom" && customMacros && (
              <div className="space-y-1 text-center">
                <p className="text-5xl font-bold text-campus-terracotta">
                  {derivedCalories}
                </p>
                <p className="text-sm text-campus-muted">kcal / jour</p>
                <p className="text-xs text-campus-muted">
                  Calculé à partir de tes objectifs de protéines/lipides/
                  glucides ci-dessous — ajuste-les pour changer ce chiffre.
                </p>
              </div>
            )}

            {calorieMode === "custom" && !customMacros && (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-5xl font-bold text-campus-terracotta">
                    {caloriesValue}
                  </p>
                  <p className="mt-1 text-sm text-campus-muted">kcal / jour</p>
                </div>
                <input
                  type="range"
                  min={CALORIE_MIN}
                  max={CALORIE_MAX}
                  step={CALORIE_STEP}
                  value={caloriesValue}
                  onChange={(e) => setCaloriesValue(Number(e.target.value))}
                  aria-label="Objectif calorique quotidien"
                  className="w-full"
                />
                <div className="flex justify-between text-xs font-medium text-campus-muted">
                  <span>{CALORIE_MIN} kcal</span>
                  <span>{CALORIE_MAX} kcal</span>
                </div>
              </div>
            )}

            {calorieMode === "custom" && (
              <div className="space-y-5 border-t border-campus-sand pt-5">
                <div>
                  <p className="mb-2 text-sm font-semibold text-campus-ink">
                    Pour affiner : ton profil corporel
                  </p>
                  <p className="text-xs text-campus-muted">
                    Sert à estimer tes besoins en protéines/lipides/glucides
                    en grammes. Ces informations sont enregistrées dans ton
                    profil pour ce calcul uniquement — jamais partagées à des
                    fins publicitaires (voir notre{" "}
                    <Link
                      href="/confidentialite"
                      target="_blank"
                      className="font-semibold text-campus-terracotta underline"
                    >
                      politique de confidentialité
                    </Link>
                    ).
                  </p>
                </div>

                <div className="flex gap-2">
                  {SEX_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSex(option.value)}
                      className={`btn-shortcut flex-1 ${
                        sex === option.value ? "btn-shortcut-active" : ""
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {sex && (
                  <>
                    {macroTargets && !customMacros && (
                      <div className="rounded-2xl bg-campus-terracotta/10 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-campus-terracotta">
                            Ton repère quotidien estimé
                          </p>
                          <button
                            type="button"
                            onClick={enableCustomMacros}
                            className="shrink-0 text-[11px] font-bold text-campus-terracotta underline"
                          >
                            Ajuster
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-extrabold text-campus-ink">
                              {macroTargets.proteinG}g
                            </p>
                            <p className="text-[11px] text-campus-muted">Protéines</p>
                          </div>
                          <div>
                            <p className="text-lg font-extrabold text-campus-ink">
                              {macroTargets.lipidesG}g
                            </p>
                            <p className="text-[11px] text-campus-muted">Lipides</p>
                          </div>
                          <div>
                            <p className="text-lg font-extrabold text-campus-ink">
                              {macroTargets.glucidesG}g
                            </p>
                            <p className="text-[11px] text-campus-muted">Glucides</p>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-campus-muted">
                          Hypothèse : activité modérée (repère indicatif, pas
                          un plan médical).
                        </p>
                        {canteenDays.length > 0 && (
                          <p className="mt-1 text-[11px] font-medium text-campus-terracotta">
                            🍽️ Repère réduit pour ne compter que les repas à
                            la maison — le déjeuner à la cantine complète le
                            reste.
                          </p>
                        )}
                      </div>
                    )}

                    {customMacros && (
                      <div className="rounded-2xl bg-campus-terracotta/10 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-campus-terracotta">
                            Tes objectifs personnalisés
                          </p>
                          <button
                            type="button"
                            onClick={() => setCustomMacros(false)}
                            className="shrink-0 text-[11px] font-bold text-campus-terracotta underline"
                          >
                            Revenir au calcul auto
                          </button>
                        </div>

                        <div className="mt-3 space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-campus-muted">Protéines</span>
                              <span className="font-bold text-campus-ink">
                                {proteinOverride} g
                              </span>
                            </div>
                            <input
                              type="range"
                              min={PROTEIN_G_MIN}
                              max={PROTEIN_G_MAX}
                              step={5}
                              value={proteinOverride}
                              onChange={(e) => setProteinOverride(Number(e.target.value))}
                              aria-label="Objectif protéines (grammes/jour)"
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-campus-muted">Lipides</span>
                              <span className="font-bold text-campus-ink">
                                {lipidesOverride} g
                              </span>
                            </div>
                            <input
                              type="range"
                              min={LIPIDES_G_MIN}
                              max={LIPIDES_G_MAX}
                              step={5}
                              value={lipidesOverride}
                              onChange={(e) => setLipidesOverride(Number(e.target.value))}
                              aria-label="Objectif lipides (grammes/jour)"
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-campus-muted">Glucides</span>
                              <span className="font-bold text-campus-ink">
                                {glucidesOverride} g
                              </span>
                            </div>
                            <input
                              type="range"
                              min={GLUCIDES_G_MIN}
                              max={GLUCIDES_G_MAX}
                              step={5}
                              value={glucidesOverride}
                              onChange={(e) => setGlucidesOverride(Number(e.target.value))}
                              aria-label="Objectif glucides (grammes/jour)"
                              className="w-full"
                            />
                          </div>
                        </div>

                        <p className="mt-3 text-[11px] text-campus-muted">
                          Ces chiffres remplacent le calcul automatique et
                          orientent la sélection des produits (plus ou moins
                          de lipides/glucides/protéines selon tes réglages).
                        </p>
                      </div>
                    )}

                    <div className="space-y-4 border-t border-campus-sand pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-campus-muted">
                        Affiner le calcul automatique
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-campus-muted">Poids</span>
                          <span className="font-bold text-campus-ink">{weightKg} kg</span>
                        </div>
                        <input
                          type="range"
                          min={WEIGHT_MIN}
                          max={WEIGHT_MAX}
                          step={1}
                          value={weightKg}
                          onChange={(e) => setWeightKg(Number(e.target.value))}
                          aria-label="Poids"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-campus-muted">Taille</span>
                          <span className="font-bold text-campus-ink">{heightCm} cm</span>
                        </div>
                        <input
                          type="range"
                          min={HEIGHT_MIN}
                          max={HEIGHT_MAX}
                          step={1}
                          value={heightCm}
                          onChange={(e) => setHeightCm(Number(e.target.value))}
                          aria-label="Taille"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-campus-muted">Âge</span>
                          <span className="font-bold text-campus-ink">{age} ans</span>
                        </div>
                        <input
                          type="range"
                          min={AGE_MIN}
                          max={AGE_MAX}
                          step={1}
                          value={age}
                          onChange={(e) => setAge(Number(e.target.value))}
                          aria-label="Âge"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <p className="text-sm leading-relaxed text-campus-muted">
              Optionnel — sert juste de repère pour équilibrer ta liste, pas
              un plan de repas précis.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {MACRO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleMacro(option.value)}
                  className={`chip ${
                    macroPreferences.includes(option.value) ? "chip-selected" : "chip-default"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-campus-muted">
              Optionnel — on privilégiera ces produits dans ta liste quand
              c&apos;est possible, dans la limite du budget.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button type="button" onClick={handleNext} className="btn-primary">
          {step === totalSteps ? "Terminer" : "Suivant"}
        </button>
        {step > 1 && (
          <button type="button" onClick={handleBack} className="btn-secondary">
            Retour
          </button>
        )}
      </div>
    </div>
  );
}
