"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ALLERGEN_OPTIONS,
  DIET_OPTIONS,
  STORAGE_KEY,
  UserPreferences,
} from "@/lib/types";

const STEPS = [
  { id: 1, title: "Budget", subtitle: "Combien veux-tu dépenser par semaine ?" },
  { id: 2, title: "Alimentation", subtitle: "Quel est ton type d'alimentation ?" },
  { id: 3, title: "Allergies", subtitle: "As-tu des allergies alimentaires ?" },
  { id: 4, title: "Préférences", subtitle: "Autres envies ou contraintes ?" },
];

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState("");
  const [diet, setDiet] = useState<UserPreferences["diet"]>("omnivore");
  const [allergies, setAllergies] = useState<UserPreferences["allergies"]>([]);
  const [freeText, setFreeText] = useState("");
  const [error, setError] = useState("");

  const currentStep = STEPS[step - 1];

  function toggleAllergy(allergen: UserPreferences["allergies"][number]) {
    setAllergies((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  }

  function handleNext() {
    setError("");

    if (step === 1) {
      const value = parseFloat(budget.replace(",", "."));
      if (isNaN(value) || value <= 0) {
        setError("Indique un budget valide en euros.");
        return;
      }
      if (value > 200) {
        setError("Le budget semble très élevé. Vérifie le montant saisi.");
        return;
      }
    }

    if (step < 4) {
      setStep(step + 1);
      return;
    }

    const preferences: UserPreferences = {
      budget: parseFloat(budget.replace(",", ".")),
      diet,
      allergies,
      freeText: freeText.trim(),
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    router.push("/resultats");
  }

  function handleBack() {
    setError("");
    if (step > 1) setStep(step - 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-campus-sageDark">
          Étape {step} sur {STEPS.length}
        </p>
        <div className="mt-2 flex gap-1.5">
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
        <p className="mt-1 text-campus-muted">{currentStep.subtitle}</p>
      </div>

      <div className="card">
        {step === 1 && (
          <div className="space-y-3">
            <label htmlFor="budget" className="block text-sm font-medium">
              Budget hebdomadaire
            </label>
            <div className="relative">
              <input
                id="budget"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.5"
                placeholder="Ex. 30"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="input-field pr-12"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-medium text-campus-muted">
                €/sem.
              </span>
            </div>
            <p className="text-sm text-campus-muted">
              En moyenne, un·e étudiant·e dépense entre 25 et 45 € par semaine
              en courses.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDiet(option.value)}
                className={`chip ${
                  diet === option.value ? "chip-selected" : "chip-default"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleAllergy(option.value)}
                  className={`chip ${
                    allergies.includes(option.value)
                      ? "chip-selected"
                      : "chip-default"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-campus-muted">
              Aucune sélection = pas d&apos;allergie signalée. Tu peux passer
              cette étape si besoin.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <label htmlFor="preferences" className="block text-sm font-medium">
              Préférences libres (optionnel)
            </label>
            <textarea
              id="preferences"
              rows={4}
              maxLength={200}
              placeholder="Ex. j'aime les pâtes, pas de café, plutôt des légumes…"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              className="input-field resize-none"
            />
            <p className="text-right text-xs text-campus-muted">
              {freeText.length}/200
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={handleNext} className="btn-primary">
          {step === 4 ? "Générer ma liste" : "Continuer"}
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
