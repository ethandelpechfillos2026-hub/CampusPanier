"use client";

import { useState } from "react";
import {
  buildWeeklyPlan,
  DAY_SLOT_ICONS,
  DAY_SLOT_LABELS,
  DAY_SLOT_ORDER,
  formatDayEntryQuantity,
  WEEKDAY_LABELS,
} from "@/lib/generateMenu";
import { ShoppingListResult, UserPreferences } from "@/lib/types";

interface MenuContentProps {
  result: ShoppingListResult;
  preferences: UserPreferences;
  onRestart: () => void;
}

export default function MenuContent({
  result,
  preferences,
  onRestart,
}: MenuContentProps) {
  const { days } = buildWeeklyPlan(result.items, preferences.eatsLunchAtCanteen);
  const [selectedDay, setSelectedDay] = useState(0);
  const isCantineDay =
    preferences.eatsLunchAtCanteen && selectedDay >= 0 && selectedDay <= 4;

  const isEmpty = result.items.length === 0;
  const day = days[selectedDay];

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
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {WEEKDAY_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedDay(index)}
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
              return (
                <section
                  key={slot}
                  className="rounded-2xl border border-campus-sand bg-white p-4"
                >
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-campus-ink">
                    <span className="text-lg">{DAY_SLOT_ICONS[slot]}</span>
                    {DAY_SLOT_LABELS[slot]}
                  </h2>
                  {entries.length === 0 && slot === "dejeuner" && isCantineDay ? (
                    <p className="text-sm text-campus-muted">
                      🍽️ Tu manges à la cantine ce midi — rien à préparer.
                    </p>
                  ) : entries.length === 0 ? (
                    <p className="text-sm text-campus-muted">
                      Rien de prévu ici avec ce budget — augmente-le
                      légèrement pour un menu complet tous les jours.
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
                </section>
              );
            })}
          </div>
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
