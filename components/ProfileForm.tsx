"use client";

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
  HEIGHT_DEFAULT,
  HEIGHT_MAX,
  HEIGHT_MIN,
  MACRO_OPTIONS,
  SEX_OPTIONS,
  UserProfile,
  WEIGHT_DEFAULT,
  WEIGHT_MAX,
  WEIGHT_MIN,
} from "@/lib/types";

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

  const currentStep = STEPS[step - 1];
  const macroTargets =
    calorieMode === "custom"
      ? computeMacroTargets({ sex, weightKg, heightCm, age }, caloriesValue)
      : null;

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
    if (step < STEPS.length) {
      setStep(step + 1);
      return;
    }

    const bodyStatsComplete = calorieMode === "custom" && sex !== null;

    onComplete({
      diet,
      allergies,
      dailyCalories: calorieMode === "custom" ? caloriesValue : null,
      macroPreferences,
      sex: bodyStatsComplete ? sex : null,
      weightKg: bodyStatsComplete ? weightKg : null,
      heightCm: bodyStatsComplete ? heightCm : null,
      age: bodyStatsComplete ? age : null,
    });
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-campus-muted">
          Étape {step} sur {STEPS.length}
        </p>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((s) => (
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
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleAllergy(option.value)}
                  className={`chip ${
                    allergies.includes(option.value) ? "chip-selected" : "chip-default"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-campus-muted">
              Optionnel — aucune sélection si tu n&apos;as pas d&apos;allergie.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCalorieMode("unknown")}
                className={`btn-shortcut flex-1 ${
                  calorieMode === "unknown" ? "btn-shortcut-active" : ""
                }`}
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

            {calorieMode === "custom" && (
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
                    en grammes — jamais stocké ailleurs que dans ce calcul.
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

                    {macroTargets && (
                      <div className="rounded-2xl bg-campus-terracotta/10 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-campus-terracotta">
                          Ton repère quotidien estimé
                        </p>
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
                      </div>
                    )}
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
          {step === STEPS.length ? "Terminer" : "Suivant"}
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
