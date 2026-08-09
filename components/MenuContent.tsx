"use client";

import { useState } from "react";
import {
  applyMealsOut,
  buildWeeklyPlan,
  DAY_SLOT_ICONS,
  DAY_SLOT_LABEL_KEYS,
  DAY_SLOT_ORDER,
  DaySlot,
  formatDayEntryQuantity,
  WEEKDAY_LABEL_KEYS,
} from "@/lib/generateMenu";
import { useTranslation } from "@/lib/i18n/LanguageContext";
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
  const { t } = useTranslation();
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
        <h1 className="text-2xl font-bold text-campus-ink">{t("menuContent.title")}</h1>
        <p className="mt-1 text-sm text-campus-muted">
          {t("menuContent.subtitle")}
        </p>
      </div>

      {isEmpty ? (
        <div className="rounded-2xl border border-campus-sand bg-campus-surface p-5 text-center">
          <p className="text-sm text-campus-muted">
            {t("menuContent.generateFirst")}
          </p>
        </div>
      ) : (
        <>
          {mealsOut.length > 0 && (
            <div className="rounded-2xl border-2 border-campus-terracotta/30 bg-campus-terracotta/5 p-4 text-sm">
              <p className="font-bold text-campus-ink">
                {t("menuContent.mealsOutSummary", {
                  count: mealsOut.length,
                  plural: mealsOut.length > 1 ? "s" : "",
                  kcal: mealsOutKcalTotal,
                })}
              </p>
              {remainingTarget !== null && (
                <p className="mt-1 text-xs text-campus-muted">
                  {t("menuContent.newTargetHint", { kcal: remainingTarget })}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {WEEKDAY_LABEL_KEYS.map((labelKey, index) => (
              <button
                key={labelKey}
                type="button"
                onClick={() => {
                  setSelectedDay(index);
                  setPickerFor(null);
                }}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  selectedDay === index
                    ? "bg-campus-terracotta text-white"
                    : "bg-campus-surface text-campus-muted border border-campus-sand"
                }`}
              >
                {t(labelKey).slice(0, 3)}
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
                  className="rounded-2xl border border-campus-sand bg-campus-surface p-4"
                >
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-campus-ink">
                    <span className="text-lg">{DAY_SLOT_ICONS[slot]}</span>
                    {t(DAY_SLOT_LABEL_KEYS[slot])}
                  </h2>

                  {mealOut ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-campus-muted">
                        {t("menuContent.eatenOut", { kcal: mealOut.estimatedKcal })}
                      </p>
                      <button
                        type="button"
                        onClick={() => undoMealOut(slot)}
                        className="shrink-0 text-xs font-bold text-campus-terracotta underline"
                      >
                        {t("menuContent.cancel")}
                      </button>
                    </div>
                  ) : (
                    <>
                      {entries.length === 0 && slot === "dejeuner" && isCantineDay ? (
                        <p className="text-sm text-campus-muted">
                          {t("menuContent.canteenNoPrep")}
                        </p>
                      ) : entries.length === 0 ? (
                        <p className="text-sm text-campus-muted">
                          {t("menuContent.nothingPlanned")}
                          {loggable && t("menuContent.eatenOutAnywayHint")}
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
                                  {t("menuContent.presetKcal", { label: t(preset.labelKey), kcal: preset.kcal })}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setPickerFor(null)}
                                className="text-xs text-campus-muted underline"
                              >
                                {t("menuContent.cancel")}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPickerFor(slot)}
                              className="text-xs font-bold text-campus-terracotta underline"
                            >
                              {t("menuContent.loggedOutside")}
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
            <div className="rounded-2xl border border-campus-sand bg-campus-surface p-4">
              <h2 className="mb-1 text-sm font-bold text-campus-ink">
                {t("menuContent.bonusTitle")}
              </h2>
              <p className="mb-3 text-xs text-campus-muted">
                {t("menuContent.bonusHint")}
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
        {t("resultsContent.redo")}
      </button>

      <p className="text-center text-xs text-campus-muted">
        {t("menuContent.footerHint")}
      </p>
    </div>
  );
}
