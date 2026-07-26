"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AidResourcesBanner from "@/components/AidResourcesBanner";
import {
  formatPrice,
  generateShoppingList,
} from "@/lib/generateShoppingList";
import {
  CATEGORY_LABELS,
  STORAGE_KEY,
  UserPreferences,
} from "@/lib/types";

export default function ResultsContent() {
  const [result, setResult] = useState<ReturnType<
    typeof generateShoppingList
  > | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as UserPreferences;
      setPreferences(parsed);
      setResult(generateShoppingList(parsed));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  if (!result || !preferences) {
    return (
      <div className="card space-y-4 text-center">
        <p className="text-campus-muted">
          Aucune liste trouvée. Commence par remplir le formulaire.
        </p>
        <Link href="/" className="btn-primary inline-flex">
          Créer ma liste
        </Link>
      </div>
    );
  }

  const budgetPercent = Math.min(
    100,
    Math.round((result.total / result.budget) * 100)
  );

  const grouped = result.items.reduce<
    Record<string, typeof result.items>
  >((acc, item) => {
    const cat = item.product.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">Ta liste de courses</h1>
        <p className="mt-1 text-campus-muted">
          Adaptée à ton profil · Budget {formatPrice(preferences.budget)}/sem.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-campus-muted">Total estimé</p>
            <p className="text-3xl font-bold text-campus-terracotta">
              {formatPrice(result.total)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-campus-muted">Budget</p>
            <p className="text-lg font-semibold">{formatPrice(result.budget)}</p>
          </div>
        </div>

        <div>
          <div className="h-3 overflow-hidden rounded-full bg-campus-sand">
            <div
              className="h-full rounded-full bg-campus-sage transition-all"
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-campus-muted">
            {result.remaining > 0
              ? `Il te reste ${formatPrice(result.remaining)} dans ton budget.`
              : "Tu as utilisé tout ton budget pour cette sélection."}
          </p>
        </div>
      </div>

      {result.showAidResources && <AidResourcesBanner />}

      {result.items.length === 0 ? (
        <div className="card text-center">
          <p className="text-campus-muted">
            Aucun produit ne correspond à tes critères avec ce budget. Essaie
            d&apos;augmenter le montant ou d&apos;ajuster tes filtres.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category} className="card">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-campus-sageDark">
                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
              </h2>
              <ul className="divide-y divide-campus-sand">
                {items.map(({ product, quantity }) => (
                  <li
                    key={product.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-campus-muted">
                        {quantity} {product.unit}
                      </p>
                    </div>
                    <p className="font-semibold text-campus-ink">
                      {formatPrice(product.price * quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Link href="/" className="btn-primary">
          Modifier mes critères
        </Link>
        <p className="text-center text-xs text-campus-muted">
          Prix indicatifs · Non contractuels
        </p>
      </div>
    </div>
  );
}
