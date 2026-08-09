"use client";

import Link from "next/link";
import { useState } from "react";
import { computeMacroTargets } from "@/lib/macros";
import { useTranslation } from "@/lib/i18n/LanguageContext";
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
  { value: 0, labelKey: "profileForm.day.mon" },
  { value: 1, labelKey: "profileForm.day.tue" },
  { value: 2, labelKey: "profileForm.day.wed" },
  { value: 3, labelKey: "profileForm.day.thu" },
  { value: 4, labelKey: "profileForm.day.fri" },
];

const STEPS = [
  { id: 1, titleKey: "profileForm.step1.title", subtitleKey: "profileForm.step1.subtitle" },
  { id: 2, titleKey: "profileForm.step2.title", subtitleKey: "profileForm.step2.subtitle" },
  { id: 3, titleKey: "profileForm.step3.title", subtitleKey: "profileForm.step3.subtitle" },
  { id: 4, titleKey: "profileForm.step4.title", subtitleKey: "profileForm.step4.subtitle" },
];

interface ProfileFormProps {
  onComplete: (profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
}

export default function ProfileForm({ onComplete, initialProfile }: ProfileFormProps) {
  const { t } = useTranslation();
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
          {t("profileForm.stepIndicator", { step, total: totalSteps })}
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
        <h1 className="text-2xl font-bold text-campus-ink">{t(currentStep.titleKey)}</h1>
        <p className="mt-1 text-sm text-campus-muted">{t(currentStep.subtitleKey)}</p>
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
                  {t("profileForm.consentText")}{" "}
                  <Link
                    href="/confidentialite"
                    target="_blank"
                    className="font-semibold text-campus-terracotta underline"
                  >
                    {t("common.privacyPolicyLink")}
                  </Link>
                  .
                </span>
              </label>
              {consentError && (
                <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
                  {t("profileForm.consentError")}
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
                  {t(option.labelKey)}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border-2 border-campus-terracotta/30 bg-campus-terracotta/5 p-4">
              <p className="text-sm font-bold text-campus-ink">
                {t("profileForm.canteenTitle")}
              </p>
              <p className="mt-0.5 text-xs text-campus-muted">
                {t("profileForm.canteenHint")}
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
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-campus-terracotta/30 bg-campus-terracotta/5 p-4">
              <p className="text-sm font-bold text-campus-ink">
                {t("profileForm.enseigneTitle")}
              </p>
              <p className="mt-0.5 text-xs text-campus-muted">
                {t("profileForm.enseigneHint")}
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
                  {t("common.noPreference")}
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
                  placeholder={t("profileForm.zonePlaceholder")}
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
                    <span className="leading-tight">{t(option.labelKey)}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm leading-relaxed text-campus-muted">
              {t("profileForm.allergyOptional")}
            </p>
            <p className="text-xs leading-relaxed text-campus-muted">
              {t("profileForm.allergyHint")}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-campus-terracotta/30 bg-campus-terracotta/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-campus-ink">
                    {t("profileForm.performanceTitle")}
                  </p>
                  <p className="mt-0.5 text-xs text-campus-muted">
                    {t("profileForm.performanceHint")}
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
                  {performanceMode ? t("profileForm.performanceActivated") : t("profileForm.performanceActivate")}
                </button>
              </div>

              {performanceMode && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-campus-muted">
                    {t("profileForm.yourObjective")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectPerformanceObjective("prise-masse")}
                      className={`btn-shortcut flex-1 ${
                        performanceObjective === "prise-masse" ? "btn-shortcut-active" : ""
                      }`}
                    >
                      {t("macroOptions.priseMasse")}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPerformanceObjective("seche")}
                      className={`btn-shortcut flex-1 ${
                        performanceObjective === "seche" ? "btn-shortcut-active" : ""
                      }`}
                    >
                      {t("macroOptions.seche")}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-campus-muted">
                    {t("profileForm.performanceSkinNote")}
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
                {t("common.noPreference")}
              </button>
              <button
                type="button"
                onClick={() => setCalorieMode("custom")}
                className={`btn-shortcut flex-1 ${
                  calorieMode === "custom" ? "btn-shortcut-active" : ""
                }`}
              >
                {t("profileForm.customizeCalories")}
              </button>
            </div>
            {performanceMode && (
              <p className="-mt-4 text-xs text-campus-muted">
                {t("profileForm.performanceCaloriesRequired")}
              </p>
            )}
            {!performanceMode && (
              <p className="-mt-2 text-xs text-campus-muted">
                {calorieMode === "unknown"
                  ? t("profileForm.calorieModeUnknownHint")
                  : t("profileForm.calorieModeCustomHint")}
              </p>
            )}

            {calorieMode === "custom" && customMacros && (
              <div className="space-y-1 text-center">
                <p className="text-5xl font-bold text-campus-terracotta">
                  {derivedCalories}
                </p>
                <p className="text-sm text-campus-muted">{t("profileForm.kcalPerDay")}</p>
                <p className="text-xs text-campus-muted">
                  {t("profileForm.derivedCaloriesHint")}
                </p>
              </div>
            )}

            {calorieMode === "custom" && !customMacros && (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-5xl font-bold text-campus-terracotta">
                    {caloriesValue}
                  </p>
                  <p className="mt-1 text-sm text-campus-muted">{t("profileForm.kcalPerDay")}</p>
                </div>
                <input
                  type="range"
                  min={CALORIE_MIN}
                  max={CALORIE_MAX}
                  step={CALORIE_STEP}
                  value={caloriesValue}
                  onChange={(e) => setCaloriesValue(Number(e.target.value))}
                  aria-label={t("profileForm.calorieSliderLabel")}
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
                    {t("profileForm.bodyProfileTitle")}
                  </p>
                  <p className="text-xs text-campus-muted">
                    {t("profileForm.bodyProfileHint")}{" "}
                    <Link
                      href="/confidentialite"
                      target="_blank"
                      className="font-semibold text-campus-terracotta underline"
                    >
                      {t("common.privacyPolicyLink")}
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
                      {t(option.labelKey)}
                    </button>
                  ))}
                </div>

                {sex && (
                  <>
                    {macroTargets && !customMacros && (
                      <div className="rounded-2xl bg-campus-terracotta/10 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-campus-terracotta">
                            {t("profileForm.dailyTargetEstimated")}
                          </p>
                          <button
                            type="button"
                            onClick={enableCustomMacros}
                            className="shrink-0 text-[11px] font-bold text-campus-terracotta underline"
                          >
                            {t("profileForm.adjust")}
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-lg font-extrabold text-campus-ink">
                              {macroTargets.proteinG}g
                            </p>
                            <p className="text-[11px] text-campus-muted">{t("profileForm.proteins")}</p>
                          </div>
                          <div>
                            <p className="text-lg font-extrabold text-campus-ink">
                              {macroTargets.lipidesG}g
                            </p>
                            <p className="text-[11px] text-campus-muted">{t("profileForm.lipids")}</p>
                          </div>
                          <div>
                            <p className="text-lg font-extrabold text-campus-ink">
                              {macroTargets.glucidesG}g
                            </p>
                            <p className="text-[11px] text-campus-muted">{t("profileForm.carbs")}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-campus-muted">
                          {t("profileForm.moderateActivityHint")}
                        </p>
                        {canteenDays.length > 0 && (
                          <p className="mt-1 text-[11px] font-medium text-campus-terracotta">
                            {t("profileForm.canteenReducedHint")}
                          </p>
                        )}
                      </div>
                    )}

                    {customMacros && (
                      <div className="rounded-2xl bg-campus-terracotta/10 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-campus-terracotta">
                            {t("profileForm.customTargetsTitle")}
                          </p>
                          <button
                            type="button"
                            onClick={() => setCustomMacros(false)}
                            className="shrink-0 text-[11px] font-bold text-campus-terracotta underline"
                          >
                            {t("profileForm.backToAutoCalc")}
                          </button>
                        </div>

                        <div className="mt-3 space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-campus-muted">{t("profileForm.proteins")}</span>
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
                              aria-label={t("profileForm.proteinSliderLabel")}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-campus-muted">{t("profileForm.lipids")}</span>
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
                              aria-label={t("profileForm.lipidesSliderLabel")}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-campus-muted">{t("profileForm.carbs")}</span>
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
                              aria-label={t("profileForm.glucidesSliderLabel")}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <p className="mt-3 text-[11px] text-campus-muted">
                          {t("profileForm.customTargetsHint")}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4 border-t border-campus-sand pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-campus-muted">
                        {t("profileForm.refineAutoCalc")}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-campus-muted">{t("profileForm.weight")}</span>
                          <span className="font-bold text-campus-ink">{weightKg} {t("profileForm.kg")}</span>
                        </div>
                        <input
                          type="range"
                          min={WEIGHT_MIN}
                          max={WEIGHT_MAX}
                          step={1}
                          value={weightKg}
                          onChange={(e) => setWeightKg(Number(e.target.value))}
                          aria-label={t("profileForm.weight")}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-campus-muted">{t("profileForm.height")}</span>
                          <span className="font-bold text-campus-ink">{heightCm} {t("profileForm.cm")}</span>
                        </div>
                        <input
                          type="range"
                          min={HEIGHT_MIN}
                          max={HEIGHT_MAX}
                          step={1}
                          value={heightCm}
                          onChange={(e) => setHeightCm(Number(e.target.value))}
                          aria-label={t("profileForm.height")}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-campus-muted">{t("profileForm.age")}</span>
                          <span className="font-bold text-campus-ink">{age} {t("profileForm.yearsOld")}</span>
                        </div>
                        <input
                          type="range"
                          min={AGE_MIN}
                          max={AGE_MAX}
                          step={1}
                          value={age}
                          onChange={(e) => setAge(Number(e.target.value))}
                          aria-label={t("profileForm.age")}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <p className="text-sm leading-relaxed text-campus-muted">
              {t("profileForm.step3Optional")}
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
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-campus-muted">
              {t("profileForm.step4Optional")}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button type="button" onClick={handleNext} className="btn-primary">
          {step === totalSteps ? t("common.finish") : t("common.next")}
        </button>
        {step > 1 && (
          <button type="button" onClick={handleBack} className="btn-secondary">
            {t("common.back")}
          </button>
        )}
      </div>
    </div>
  );
}
