"use client";

import { formatPrice } from "@/lib/generateShoppingList";
import { formatDailyServing, organizeMenu } from "@/lib/generateMenu";
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">Mon menu</h1>
        <p className="mt-1 text-sm text-campus-muted">
          Ta liste répartie par moment de la journée
        </p>
      </div>

      {sections.length === 0 ? (
        <div className="rounded-2xl border border-campus-sand bg-white p-5 text-center">
          <p className="text-sm text-campus-muted">
            Génère d&apos;abord une liste pour voir ton menu.
          </p>
        </div>
      ) : (
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
      )}

      <button type="button" onClick={onRestart} className="btn-primary">
        Refaire
      </button>

      <p className="text-center text-xs text-campus-muted">
        Répartition indicative selon le type de produit, pas un planning
        figé — organise tes repas comme tu veux. Les produits sans repère
        journalier (huile, riz sec, pâtes...) se dosent librement selon la
        recette.
      </p>
    </div>
  );
}
