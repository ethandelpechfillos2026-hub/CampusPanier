"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/generateShoppingList";
import {
  buildWeeklyPlan,
  DAY_SLOT_ICONS,
  DAY_SLOT_LABELS,
  DAY_SLOT_ORDER,
  formatDailyServing,
  organizeMenu,
  WEEKDAY_LABELS,
} from "@/lib/generateMenu";
import {
  MEAL_SLOT_ICONS,
  MEAL_SLOT_LABELS,
  ShoppingListResult,
} from "@/lib/types";

interface MenuContentProps {
  result: ShoppingListResult;
  onRestart: () => void;
}

export default function MenuContent({ result, onRestart }: MenuContentProps) {
  const sections = organizeMenu(result.items);
  const { days, pantryItems } = buildWeeklyPlan(result.items);
  const [selectedDay, setSelectedDay] = useState(0);

  const isEmpty = result.items.length === 0;
  const day = days[selectedDay];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">Mon menu</h1>
        <p className="mt-1 text-sm text-campus-muted">
          Ta liste répartie par moment de la journée
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
          {/* Récapitulatif hebdomadaire */}
          <div className="space-y-4">
            {sections.map(({ slot, items, totalKcal }) => (
              <section
                key={slot}
                className="rounded-2xl border border-campus-sand bg-white p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-campus-ink">
                    <span className="text-lg">{MEAL_SLOT_ICONS[slot]}</span>
                    {MEAL_SLOT_LABELS[slot]}
                  </h2>
                  {totalKcal > 0 && (
                    <span className="text-xs font-medium text-campus-muted">
                      ~{totalKcal} kcal
                    </span>
                  )}
                </div>
                <ul className="space-y-2.5">
                  {items.map(({ product, quantity }) => {
                    const dailyServing = formatDailyServing(product, quantity);
                    return (
                      <li key={product.id} className="px-1 py-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-campus-ink">
                            {product.name}
                            {quantity > 1 && (
                              <span className="text-campus-muted"> ×{quantity}</span>
                            )}
                          </span>
                          <span className="shrink-0 font-semibold text-campus-ink">
                            {formatPrice(product.price * quantity)}
                          </span>
                        </div>
                        {dailyServing && (
                          <p className="mt-0.5 text-xs text-campus-muted">
                            {dailyServing}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          {/* Planning jour par jour */}
          <div>
            <h2 className="mb-1 text-lg font-bold text-campus-ink">
              Planning jour par jour
            </h2>
            <p className="mb-3 text-sm text-campus-muted">
              Un aperçu concret de quoi manger chaque jour, avec les
              quantités exactes.
            </p>

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

            <div className="mt-3 space-y-4">
              {DAY_SLOT_ORDER.map((slot) => {
                const entries = day.slots[slot];
                if (entries.length === 0) return null;
                return (
                  <section
                    key={slot}
                    className="rounded-2xl border border-campus-sand bg-white p-4"
                  >
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-campus-ink">
                      <span className="text-lg">{DAY_SLOT_ICONS[slot]}</span>
                      {DAY_SLOT_LABELS[slot]}
                    </h3>
                    <ul className="space-y-2">
                      {entries.map(({ product, count }) => (
                        <li
                          key={product.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="font-medium text-campus-ink">
                            {product.name}
                          </span>
                          <span className="shrink-0 font-semibold text-campus-terracotta">
                            {count}{" "}
                            {count > 1
                              ? `${product.servingUnit}s`
                              : product.servingUnit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}

              {DAY_SLOT_ORDER.every((slot) => day.slots[slot].length === 0) && (
                <div className="rounded-2xl border border-campus-sand bg-white p-5 text-center">
                  <p className="text-sm text-campus-muted">
                    Rien de prévu ce jour-là pour les produits à quantité
                    fixe — pioche dans le garde-manger ci-dessous.
                  </p>
                </div>
              )}
            </div>

            {pantryItems.length > 0 && (
              <section className="mt-4 rounded-2xl border border-campus-sand/80 bg-orange-50/40 p-4">
                <h3 className="mb-1 text-sm font-bold text-campus-ink">
                  Garde-manger de la semaine
                </h3>
                <p className="mb-3 text-xs text-campus-muted">
                  À doser librement selon tes recettes, pas de quantité fixe
                  par jour.
                </p>
                <ul className="space-y-1.5">
                  {pantryItems.map(({ product, quantity }) => (
                    <li
                      key={product.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-campus-ink">
                        {product.name}
                        {quantity > 1 && (
                          <span className="text-campus-muted"> ×{quantity}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-medium text-campus-muted">
                        {formatPrice(product.price * quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </>
      )}

      <button type="button" onClick={onRestart} className="btn-primary">
        Refaire
      </button>

      <p className="text-center text-xs text-campus-muted">
        Répartition indicative pour t&apos;aider à organiser ta semaine, pas
        un planning figé — la somme des quantités par jour correspond bien
        à ta liste de courses et à ton budget.
      </p>
    </div>
  );
}
