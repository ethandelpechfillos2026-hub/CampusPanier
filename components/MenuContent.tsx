"use client";

import { useState } from "react";
import {
  applyMealsOut,
  buildWeeklyPlan,
  DAY_SLOT_ICONS,
  DAY_SLOT_LABELS,
  DAY_SLOT_ORDER,
  DaySlot,
  formatDayEntryQuantity,
  WEEKDAY_LABELS,
} from "@/lib/generateMenu";
import { getRemainingHomeMealTarget } from "@/lib/macros";
import {
  MEAL_OUT_PRESETS,
  MealOutEntry,
  ShoppingListResult,
  UserPreferences,
} from "@/lib/types";

interface MenuContentProps {
  result: ShoppingListResult;
  preferences: UserPreferences;
  onRestart: () => void;
  mealsOut: MealOutEntry[];
  onMealsOutChange: (mealsOut: MealOutEntry[]) => void;
}

// Seuls le déjeuner et le dîner peuvent être "mangés dehors" — un vrai repas
// complet remplacé par un autre pris à l'extérieur. Le petit-déjeuner et la
// collation restent hors de ce suivi pour ne pas complexifier l'interface
// pour un cas bien plus rare.
const LOGGABLE_SLOTS: DaySlot[] = ["dejeuner", "diner"];

export default function MenuContent({
  result,
  preferences,
  onRestart,
  mealsOut,
  onMealsOutChange,
}: MenuContentProps) {
  const rawPlan = buildWeeklyPlan(result.items, preferences.canteenDays);
  const { days, bonusItems } = applyMealsOut(rawPlan, mealsOut);
  const [selectedDay, setSelectedDay] = useState(0);
  const [pickerFor, setPickerFor] = useState<DaySlot | null>(null);
  const isCantineDay = preferences.canteenDays.includes(selectedDay);

  const isEmpty = result.items.length === 0;
  const day = days[selectedDay];

  const remainingTarget = getRemainingHomeMealTarget(
    preferences,
    preferences.dailyCalories,
    mealsOut
  );
  const mealsOutKcalTotal = mealsOut.reduce(
    (sum, m) => sum + m.estimatedKcal,
    0
  );

  function findMealOut(dayIndex: number, slot: DaySlot) {
    return mealsOut.find((m) => m.dayIndex === dayIndex && m.slot === slot);
  }

  function logMealOut(slot: DaySlot, kcal: number) {
    if (slot !== "dejeuner" && slot !== "diner") return;
    onMealsOutChange([
      ...mealsOut.filter(
        (m) => !(m.dayIndex === selectedDay && m.slot === slot)
      ),
      { dayIndex: selectedDay, slot, estimatedKcal: kcal },
    ]);
    setPickerFor(null);
  }

  function undoMealOut(slot: DaySlot) {
    onMealsOutChange(
      mealsOut.filter((m) => !(m.dayIndex === selectedDay && m.slot === slot))
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">Mon menu</h1>
        <p className="mt-1 text-sm text-campus-muted">
          Quoi manger chaque jour, avec les quantités du jour
        </p>
      </div>

      {isEmpty ? (
        <div className="rounded-2xl border border-campus-sand bg-white p-5 text-center">
          <p className="text-sm text-campus-muted">
            Génère d&apos;abord une liste pour voir ton menu.
          </p>
        </div>
      ) : (
        <>
          {mealsOut.length > 0 && (
            <div className="rounded-2xl border-2 border-campus-terracotta/30 bg-campus-terracotta/5 p-4 text-sm">
              <p className="font-bold text-campus-ink">
                🍕 {mealsOut.length} repas mangé{mealsOut.length > 1 ? "s" : ""}{" "}
                dehors cette semaine (~{mealsOutKcalTotal} kcal)
              </p>
              {remainingTarget !== null && (
                <p className="mt-1 text-xs text-campus-muted">
                  Nouvel objectif : ~{remainingTarget} kcal par repas maison
                  restant, pour compenser sur le reste de la semaine.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {WEEKDAY_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setSelectedDay(index);
                  setPickerFor(null);
                }}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  selectedDay === index
                    ? "bg-campus-terracotta text-white"
                    : "bg-white text-campus-muted border border-campus-sand"
                }`}
              >
                {label.slice(0, 3)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {DAY_SLOT_ORDER.map((slot) => {
              const entries = day.slots[slot];
              const loggable = LOGGABLE_SLOTS.includes(slot);
              const mealOut = loggable ? findMealOut(selectedDay, slot) : undefined;

              return (
                <section
                  key={slot}
                  className="rounded-2xl border border-campus-sand bg-white p-4"
                >
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-campus-ink">
                    <span className="text-lg">{DAY_SLOT_ICONS[slot]}</span>
                    {DAY_SLOT_LABELS[slot]}
                  </h2>

                  {mealOut ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-campus-muted">
                        🍕 Mangé dehors (~{mealOut.estimatedKcal} kcal)
                      </p>
                      <button
                        type="button"
                        onClick={() => undoMealOut(slot)}
                        className="shrink-0 text-xs font-bold text-campus-terracotta underline"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <>
                      {entries.length === 0 && slot === "dejeuner" && isCantineDay ? (
                        <p className="text-sm text-campus-muted">
                          🍽️ Tu manges à la cantine ce midi — rien à préparer.
                        </p>
                      ) : entries.length === 0 ? (
                        <p className="text-sm text-campus-muted">
                          Rien de prévu ici avec ce budget — augmente-le
                          légèrement pour un menu complet tous les jours.
                          {loggable &&
                            " Tu es quand même sorti·e manger ? Tu peux le noter ci-dessous."}
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {entries.map(({ product, count }) => (
                            <li
                              key={product.id}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="font-medium text-campus-ink">
                                {product.shortName ?? product.name}
                              </span>
                              <span className="shrink-0 font-semibold text-campus-terracotta">
                                {formatDayEntryQuantity(product, count)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Cantine ce midi : le repas est déjà "hors maison" par
                          définition, pas besoin de proposer en plus de le
                          logger comme repas dehors imprévu. */}
                      {loggable && !(entries.length === 0 && slot === "dejeuner" && isCantineDay) && (
                        <div className="mt-3 border-t border-campus-sand pt-3">
                          {pickerFor === slot ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {MEAL_OUT_PRESETS.map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => logMealOut(slot, preset.kcal)}
                                  className="btn-shortcut"
                                >
                                  {preset.label} (~{preset.kcal} kcal)
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setPickerFor(null)}
                                className="text-xs text-campus-muted underline"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPickerFor(slot)}
                              className="text-xs font-bold text-campus-terracotta underline"
                            >
                              🍕 J&apos;ai mangé dehors
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </section>
              );
            })}
          </div>

          {bonusItems.length > 0 && (
            <div className="rounded-2xl border border-campus-sand bg-white p-4">
              <h2 className="mb-1 text-sm font-bold text-campus-ink">
                🎁 En bonus cette semaine
              </h2>
              <p className="mb-3 text-xs text-campus-muted">
                Déjà acheté pour un repas que tu n&apos;as finalement pas fait
                à la maison — à caser dans un autre repas, en accompagnement,
                ou à congeler.
              </p>
              <ul className="space-y-2">
                {bonusItems.map(({ product, count }) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="font-medium text-campus-ink">
                      {product.shortName ?? product.name}
                    </span>
                    <span className="shrink-0 font-semibold text-campus-terracotta">
                      {formatDayEntryQuantity(product, count)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <button type="button" onClick={onRestart} className="btn-primary">
        Refaire
      </button>

      <p className="text-center text-xs text-campus-muted">
        Répartition indicative pour t&apos;aider à organiser ta semaine — le
        détail complet des quantités hebdomadaires est dans l&apos;onglet
        &quot;Ma liste&quot;.
      </p>
    </div>
  );
}
