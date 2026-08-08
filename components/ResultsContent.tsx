"use client";

import { useRef, useState } from "react";
import StatsHeader from "@/components/StatsHeader";
import {
  findSubstitutes,
  formatPrice,
  formatPriceProvenance,
  getPriceReliability,
} from "@/lib/generateShoppingList";
import { getActiveMacroTargets } from "@/lib/macros";
import { recordListFullyChecked } from "@/lib/stats";
import {
  ALLERGEN_OPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  MACRO_OPTIONS,
  NutriLevel,
  Product,
  ShoppingListResult,
  UserPreferences,
} from "@/lib/types";

interface ResultsContentProps {
  result: ShoppingListResult;
  preferences: UserPreferences;
  onRestart: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onSwapProduct: (oldProductId: string, newProduct: Product) => void;
}

// Libellés du "tableau nutritionnel" du popup produit — les seules données
// dont on dispose sont ces niveaux qualitatifs (voir Product dans
// lib/types.ts), pas de grammes précis : pas question d'inventer une
// précision qu'on n'a pas.
const LEVEL_LABELS: Record<NutriLevel, string> = {
  faible: "Faible",
  moyen: "Moyen",
  riche: "Riche",
};

export default function ResultsContent({
  result,
  preferences,
  onRestart,
  isFavorited,
  onToggleFavorite,
  onSwapProduct,
}: ResultsContentProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const hasRecordedCompletionRef = useRef(false);
  // Incrémenté quand la liste vient d'être entièrement cochée, pour dire au
  // bloc de progression "revérifie les badges maintenant" — sinon il ne se
  // rafraîchit que quand une nouvelle liste est générée, jamais en cochant
  // les articles de la liste actuelle.
  const [completionSignal, setCompletionSignal] = useState(0);
  // Popup nutrition/échange ouvert en cliquant sur un produit (pas sur sa
  // case à cocher, voir plus bas) — retour utilisateur (8 août 2026).
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  // Jusqu'à 4 options de remplacement (voir findSubstitutes) calculées à
  // l'ouverture du popup — retour utilisateur : "je peux juste le changer
  // une fois, je voudrais au moins quatre options" plutôt qu'un seul
  // remplaçant imposé.
  const [substitutes, setSubstitutes] = useState<Product[]>([]);

  function handleOpenProduct(product: Product) {
    const excludeIds = new Set(result.items.map((item) => item.product.id));
    setSubstitutes(findSubstitutes(product, preferences, excludeIds));
    setSelectedProduct(product);
  }

  function handleChooseSubstitute(oldProduct: Product, newProduct: Product) {
    // Le produit remplacé n'a pas encore été acheté sous sa nouvelle
    // identité — on retire son éventuelle coche plutôt que de la laisser
    // trainer sur un id qui n'est plus dans la liste.
    setCheckedIds((prev) => {
      if (!prev.has(oldProduct.id)) return prev;
      const next = new Set(prev);
      next.delete(oldProduct.id);
      return next;
    });
    onSwapProduct(oldProduct.id, newProduct);
    setSelectedProduct(null);
    setSubstitutes([]);
  }

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
            {preferences.dailyCalories &&
              ` · ~${
                preferences.canteenDays.length > 0 && macroTargets
                  ? macroTargets.calories
                  : preferences.dailyCalories
              } kcal/j${preferences.canteenDays.length > 0 ? " à la maison" : ""}`}
          </p>
          {macroTargets && (
            <p className="mt-1 text-xs text-campus-muted">
              Repère : ~{macroTargets.proteinG}g protéines ·{" "}
              {macroTargets.lipidesG}g lipides · {macroTargets.glucidesG}g
              glucides / jour
            </p>
          )}
          {preferences.canteenDays.length > 0 && preferences.dailyCalories && (
            <p className="mt-1 text-[11px] text-campus-terracotta">
              🍽️ Objectif total {preferences.dailyCalories} kcal/j — la
              cantine du midi couvre le reste.
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
          <p className="text-[11px] text-campus-muted">
            Sous chaque article : &quot;Relevé&quot; (enseigne, ville, date),
            &quot;Relevé ancien&quot; si ça date, ou &quot;Estimation&quot;
            quand on n&apos;a rien de précis.
          </p>
          {grouped.map(({ category, items }) => (
            <section
              key={category}
              className="rounded-2xl border border-campus-sand bg-white p-4"
            >
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-campus-muted">
                {CATEGORY_LABELS[category]}
              </h2>
              <ul className="space-y-1">
                {items.map(({ product, quantity }) => {
                  const isChecked = checkedIds.has(product.id);
                  const provenance = formatPriceProvenance(product.priceInfo);
                  const reliability = getPriceReliability(product.priceInfo);
                  return (
                    <li key={product.id}>
                      {/* Case à cocher et reste de la ligne séparés
                          volontairement (retour utilisateur, 8 août 2026) :
                          cocher se fait uniquement en appuyant sur la case,
                          cliquer sur le produit ouvre le popup nutrition/
                          échange ci-dessous, plutôt que les deux gestes se
                          marchant dessus comme avec un <label> englobant. */}
                      <div className="flex items-start gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-orange-50/60">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleChecked(product.id)}
                          aria-label={`Cocher ${product.name}`}
                          className="mt-3.5 h-5 w-5 shrink-0 rounded-md border-2 border-campus-sand accent-campus-terracotta"
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenProduct(product)}
                          className="flex flex-1 items-start gap-3 py-1.5 text-left"
                        >
                          <span className="flex-1">
                            <span
                              className={`block text-sm font-medium ${
                                isChecked
                                  ? "text-campus-muted line-through"
                                  : "text-campus-ink"
                              }`}
                            >
                              {product.name}
                              {quantity > 1 && (
                                <span className="ml-1.5 text-xs font-bold text-campus-terracotta">
                                  ×{quantity}
                                </span>
                              )}
                            </span>
                            {!isChecked && (
                              <span
                                className={`block text-[11px] ${
                                  reliability === "old"
                                    ? "text-amber-600"
                                    : "text-campus-muted"
                                }`}
                              >
                                {provenance}
                              </span>
                            )}
                          </span>
                          <span
                            className={`shrink-0 text-sm font-semibold ${
                              isChecked
                                ? "text-campus-muted line-through"
                                : "text-campus-ink"
                            }`}
                          >
                            {formatPrice(product.price * quantity)}
                          </span>
                        </button>
                      </div>
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

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-5"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-campus-ink">
                {selectedProduct.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label="Fermer"
                className="shrink-0 text-2xl leading-none text-campus-muted"
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-sm text-campus-muted">
              {formatPrice(selectedProduct.price)}
            </p>

            {selectedProduct.nutritionPer100g ? (
              <>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-campus-muted">
                  Pour 100 g
                </p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-campus-terracotta/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                      Calories
                    </p>
                    <p className="text-sm font-bold text-campus-ink">
                      {selectedProduct.nutritionPer100g.kcal ?? "—"} kcal
                    </p>
                  </div>
                  <div className="rounded-xl bg-campus-terracotta/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                      Protéines
                    </p>
                    <p className="text-sm font-bold text-campus-ink">
                      {selectedProduct.nutritionPer100g.proteinG ?? "—"} g
                    </p>
                  </div>
                  <div className="rounded-xl bg-campus-terracotta/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                      Lipides {selectedProduct.nutritionPer100g.satureesG != null ? "(dont AGS)" : ""}
                    </p>
                    <p className="text-sm font-bold text-campus-ink">
                      {selectedProduct.nutritionPer100g.lipidesG ?? "—"} g
                      {selectedProduct.nutritionPer100g.satureesG != null && (
                        <span className="ml-1 text-xs font-normal text-campus-muted">
                          ({selectedProduct.nutritionPer100g.satureesG} g)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-campus-terracotta/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                      Glucides {selectedProduct.nutritionPer100g.sucresG != null ? "(dont sucres)" : ""}
                    </p>
                    <p className="text-sm font-bold text-campus-ink">
                      {selectedProduct.nutritionPer100g.glucidesG ?? "—"} g
                      {selectedProduct.nutritionPer100g.sucresG != null && (
                        <span className="ml-1 text-xs font-normal text-campus-muted">
                          ({selectedProduct.nutritionPer100g.sucresG} g)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl bg-campus-terracotta/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                      Fibres
                    </p>
                    <p className="text-sm font-bold text-campus-ink">
                      {selectedProduct.nutritionPer100g.fibresG ?? "—"} g
                    </p>
                  </div>
                  <div className="rounded-xl bg-campus-terracotta/10 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                      Sel
                    </p>
                    <p className="text-sm font-bold text-campus-ink">
                      {selectedProduct.nutritionPer100g.selG ?? "—"} g
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-campus-muted">
                  {selectedProduct.nutritionPer100g.nutritionSource === "ciqual-2025"
                    ? "Source : Anses, 2025, Table de composition nutritionnelle des aliments Ciqual."
                    : selectedProduct.nutritionPer100g.nutritionSource === "open-food-facts"
                      ? "Source : Open Food Facts."
                      : selectedProduct.nutritionPer100g.nutritionSource === "manufacturer"
                        ? "Source : étiquette fabricant."
                        : null}
                  {selectedProduct.nutritionPer100g.matchConfidence === "review" && (
                    <span className="ml-1 italic">(correspondance à vérifier)</span>
                  )}
                </p>
              </>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-campus-terracotta/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                    Calories
                  </p>
                  <p className="text-sm font-bold text-campus-ink">
                    {selectedProduct.kcal} kcal
                  </p>
                </div>
                <div className="rounded-xl bg-campus-terracotta/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                    Protéines
                  </p>
                  <p className="text-sm font-bold text-campus-ink">
                    {LEVEL_LABELS[selectedProduct.protein]}
                  </p>
                </div>
                <div className="rounded-xl bg-campus-terracotta/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                    Lipides
                  </p>
                  <p className="text-sm font-bold text-campus-ink">
                    {LEVEL_LABELS[selectedProduct.lipides]}
                  </p>
                </div>
                <div className="rounded-xl bg-campus-terracotta/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                    Glucides
                  </p>
                  <p className="text-sm font-bold text-campus-ink">
                    {LEVEL_LABELS[selectedProduct.glucides]}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl bg-campus-terracotta/10 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-campus-muted">
                    Sel
                  </p>
                  <p className="text-sm font-bold text-campus-ink">
                    {LEVEL_LABELS[selectedProduct.sel]}
                  </p>
                </div>
              </div>
            )}

            {selectedProduct.allergens.length > 0 && (
              <p className="mt-3 text-xs text-campus-muted">
                Allergènes :{" "}
                {selectedProduct.allergens
                  .map(
                    (allergen) =>
                      ALLERGEN_OPTIONS.find((option) => option.value === allergen)
                        ?.label ?? allergen
                  )
                  .join(", ")}
              </p>
            )}

            <div className="mt-5 border-t border-campus-sand pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-campus-muted">
                🔄 Échanger contre...
              </p>
              <p className="mt-1 text-[11px] text-campus-muted">
                Valeur nutritionnelle proche, prix aussi proche que possible
                pour ne pas changer le budget de la liste — dans la limite de
                ce que propose le catalogue.
              </p>

              {substitutes.length === 0 ? (
                <p className="mt-3 text-xs font-semibold text-red-600">
                  Aucun remplacement à valeur nutritionnelle proche trouvé
                  dans le catalogue pour ce produit.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {substitutes.map((candidate) => {
                    const currentQuantity =
                      result.items.find(
                        (item) => item.product.id === selectedProduct.id
                      )?.quantity ?? 1;
                    const delta =
                      (candidate.price - selectedProduct.price) * currentQuantity;
                    return (
                      <li key={candidate.id}>
                        <button
                          type="button"
                          onClick={() =>
                            handleChooseSubstitute(selectedProduct, candidate)
                          }
                          className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-campus-sand px-3 py-2.5 text-left transition-colors hover:border-campus-terracotta"
                        >
                          <span>
                            <span className="block text-sm font-semibold text-campus-ink">
                              {candidate.name}
                            </span>
                            <span className="block text-[11px] text-campus-muted">
                              {candidate.kcal} kcal · Protéines{" "}
                              {LEVEL_LABELS[candidate.protein].toLowerCase()}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-xs font-bold text-campus-terracotta">
                            {formatPrice(candidate.price)}
                            <span className="block font-normal text-campus-muted">
                              {delta === 0
                                ? "budget inchangé"
                                : `${delta > 0 ? "+" : ""}${formatPrice(delta)}`}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
