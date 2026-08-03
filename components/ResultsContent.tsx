"use client";

import { useRef, useState } from "react";
import StatsHeader from "@/components/StatsHeader";
import { formatPrice } from "@/lib/generateShoppingList";
import { getActiveMacroTargets } from "@/lib/macros";
import { recordListFullyChecked } from "@/lib/stats";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  MACRO_OPTIONS,
  ShoppingListResult,
  UserPreferences,
} from "@/lib/types";

interface ResultsContentProps {
  result: ShoppingListResult;
  preferences: UserPreferences;
  onRestart: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export default function ResultsContent({
  result,
  preferences,
  onRestart,
  isFavorited,
  onToggleFavorite,
}: ResultsContentProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const hasRecordedCompletionRef = useRef(false);
  // Incrémenté quand la liste vient d'être entièrement cochée, pour dire au
  // bloc de progression "revérifie les badges maintenant" — sinon il ne se
  // rafraîchit que quand une nouvelle liste est générée, jamais en cochant
  // les articles de la liste actuelle.
  const [completionSignal, setCompletionSignal] = useState(0);

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (
        next.size === result.items.length &&
        !hasRecordedCompletionRef.current
      ) {
        hasRecordedCompletionRef.current = true;
        recordListFullyChecked();
        setCompletionSignal((n) => n + 1);
      }
      return next;
    });
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: result.items.filter((item) => item.product.category === category),
  })).filter((group) => group.items.length > 0);

  const macroTargets = getActiveMacroTargets(preferences, preferences.dailyCalories);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-campus-ink">Ta liste</h1>
          <p className="mt-1 text-sm text-campus-muted">
            Budget {formatPrice(preferences.budget)}/sem.
            {preferences.dailyCalories && ` · ~${preferences.dailyCalories} kcal/j`}
          </p>
          {macroTargets && (
            <p className="mt-1 text-xs text-campus-muted">
              Repère : ~{macroTargets.proteinG}g protéines ·{" "}
              {macroTargets.lipidesG}g lipides · {macroTargets.glucidesG}g
              glucides / jour
            </p>
          )}
          {preferences.macroPreferences.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {preferences.macroPreferences.map((value) => {
                const label = MACRO_OPTIONS.find(
                  (option) => option.value === value
                )?.label;
                if (!label) return null;
                return (
                  <li
                    key={value}
                    className="text-xs text-campus-muted before:mr-1.5 before:text-campus-terracotta before:content-['•']"
                  >
                    {label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={
            isFavorited ? "Retirer des listes favorites" : "Enregistrer cette liste"
          }
          className="shrink-0 text-2xl leading-none text-campus-terracotta"
        >
          {isFavorited ? "★" : "☆"}
        </button>
      </div>

      <StatsHeader result={result} refreshSignal={completionSignal} />

      {result.isBudgetInsufficient && (
        <div className="rounded-2xl border border-campus-terracotta/40 bg-campus-terracotta/10 p-4">
          <p className="text-sm font-bold text-campus-ink">
            Ton budget ne couvre pas un panier complet
          </p>
          <p className="mt-1 text-sm text-campus-muted">
            Il manquerait environ{" "}
            {formatPrice(
              Math.max(0, result.minimalBalancedCost - preferences.budget)
            )}{" "}
            pour un panier équilibré. Tu n&apos;es pas seul·e — des
            associations étudiantes peuvent t&apos;aider, sans jugement.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              <a
                href="https://cop1.fr"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-campus-terracotta underline"
              >
                Cop1 — Solidarités étudiantes
              </a>
            </li>
            <li>
              <a
                href="https://linkee.co"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-campus-terracotta underline"
              >
                Linkee — colis alimentaires étudiants
              </a>
            </li>
            <li>
              <span className="font-semibold text-campus-ink">Agoraé</span> —
              épicerie solidaire de ton campus, renseigne-toi auprès de ton
              BDE ou du CROUS
            </li>
          </ul>
        </div>
      )}

      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-campus-sand bg-white p-5 text-center">
          <p className="text-sm text-campus-muted">
            Aucun produit ne correspond à tes critères. Essaie d&apos;augmenter
            ton budget ou d&apos;ajuster tes filtres.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, items }) => (
            <section
              key={category}
              className="rounded-2xl border border-campus-sand bg-white p-4"
            >
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-campus-muted">
                {CATEGORY_LABELS[category]}
              </h2>
              <ul className="space-y-1">
                {items.map(({ product }) => {
                  const isChecked = checkedIds.has(product.id);
                  return (
                    <li key={product.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-orange-50/60">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleChecked(product.id)}
                          className="h-5 w-5 shrink-0 rounded-md border-2 border-campus-sand accent-campus-terracotta"
                        />
                        <span
                          className={`flex-1 text-sm font-medium ${
                            isChecked
                              ? "text-campus-muted line-through"
                              : "text-campus-ink"
                          }`}
                        >
                          {product.name}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            isChecked
                              ? "text-campus-muted line-through"
                              : "text-campus-ink"
                          }`}
                        >
                          {formatPrice(product.price)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <button type="button" onClick={onRestart} className="btn-primary">
        Refaire
      </button>

      <p className="text-center text-xs text-campus-muted">
        Prix indicatifs · Non contractuels
      </p>
    </div>
  );
}
