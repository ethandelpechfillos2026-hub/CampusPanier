"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { BUDGET_DEFAULT, BUDGET_MAX, BUDGET_MIN, BUDGET_SHORTCUTS } from "@/lib/types";

interface BudgetStepProps {
  onSubmit: (budget: number) => void;
  onEditProfile: () => void;
}

export default function BudgetStep({ onSubmit, onEditProfile }: BudgetStepProps) {
  const { t } = useTranslation();
  const [budget, setBudget] = useState(BUDGET_DEFAULT);

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">{t("budgetStep.title")}</h1>
        <p className="mt-1 text-sm text-campus-muted">
          {t("budgetStep.subtitle")}
        </p>
      </div>

      <div className="flex-1 space-y-6">
        <div className="text-center">
          <p className="text-5xl font-bold text-campus-terracotta">{budget}&nbsp;€</p>
          <p className="mt-1 text-sm text-campus-muted">{t("budgetStep.perWeek")}</p>
        </div>

        <input
          type="range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={1}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          aria-label={t("budgetStep.sliderLabel")}
          className="w-full"
        />

        <div className="flex justify-between text-xs font-medium text-campus-muted">
          <span>{BUDGET_MIN}&nbsp;€</span>
          <span>{BUDGET_MAX}&nbsp;€</span>
        </div>

        <div className="flex gap-2">
          {BUDGET_SHORTCUTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setBudget(amount)}
              className={`btn-shortcut ${budget === amount ? "btn-shortcut-active" : ""}`}
            >
              {amount}&nbsp;€
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button type="button" onClick={() => onSubmit(budget)} className="btn-primary">
          {t("budgetStep.generateButton")}
        </button>
        <button type="button" onClick={onEditProfile} className="btn-back">
          <span aria-hidden="true">←</span>
          {t("budgetStep.editProfileButton")}
        </button>
      </div>
    </div>
  );
}
