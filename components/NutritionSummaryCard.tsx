import {
  computePersonalCoverage,
  computeReferenceCoverage,
  computeShoppingListNutrition,
  EU_REFERENCE_INTAKE_2000KCAL,
} from "@/lib/nutritionSummary";
import { MacroTargets } from "@/lib/macros";
import { ShoppingListItem } from "@/lib/types";

interface NutritionSummaryCardProps {
  items: ShoppingListItem[];
  macroTargets: MacroTargets | null;
}

// Une barre de progression simple réutilisée pour chaque nutriment — le
// pourcentage peut dépasser 100 (ex: trop de sel), la barre se limite alors
// visuellement à 100% pleine mais le chiffre affiché, lui, reste exact.
function CoverageBar({
  label,
  valueG,
  pct,
  overThreshold = 120,
}: {
  label: string;
  valueG: number;
  pct: number | null;
  overThreshold?: number;
}) {
  const pctColor =
    pct === null
      ? "text-campus-muted"
      : pct >= overThreshold
        ? "text-red-600"
        : pct >= 100
          ? "text-amber-600"
          : "text-campus-ink";
  const barColor =
    pct !== null && pct >= overThreshold ? "bg-red-500" : "bg-campus-terracotta";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-campus-ink">{label}</p>
        <p className="text-xs font-semibold">
          <span className="text-campus-ink">{valueG}g</span>
          {pct !== null && <span className={`ml-1 ${pctColor}`}>{pct}%</span>}
        </p>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-campus-sand/60">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${pct === null ? 0 : Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// Bilan nutritionnel de la liste générée (moyenne quotidienne, semaine
// complète) — compare aux objectifs personnalisés (calories/protéines/
// lipides/glucides, voir lib/macros.ts) quand le profil corporel est
// complet, et aux repères officiels UE (sucres/AGS/sel, règlement (UE)
// n°1169/2011) sinon. Calculé uniquement sur les articles ayant un poids
// réel connu et une fiche nutritionnelle tracée (voir
// lib/nutritionSummary.ts) — jamais une estimation inventée pour le reste,
// dont le nombre est affiché en toute transparence.
export default function NutritionSummaryCard({
  items,
  macroTargets,
}: NutritionSummaryCardProps) {
  const summary = computeShoppingListNutrition(items);
  const { dailyAverage, itemsCounted, itemsExcluded, totalItems } = summary;

  if (itemsCounted === 0) {
    return null;
  }

  const personal = computePersonalCoverage(dailyAverage, macroTargets);
  const reference = computeReferenceCoverage(dailyAverage);

  return (
    <div className="rounded-2xl border border-campus-sand bg-white p-5">
      <h2 className="text-sm font-bold text-campus-ink">
        🍎 Bilan nutritionnel (moyenne/jour)
      </h2>
      <p className="mt-0.5 text-[11px] text-campus-muted">
        Calculé sur {itemsCounted}/{totalItems} article
        {totalItems > 1 ? "s" : ""} de ta liste (poids et fiche
        nutritionnelle connus).
      </p>

      {macroTargets ? (
        <div className="mt-4 space-y-3">
          <CoverageBar
            label="Calories"
            valueG={Math.round(dailyAverage.kcal)}
            pct={personal.kcalPct}
          />
          <CoverageBar
            label="Protéines"
            valueG={dailyAverage.proteinG}
            pct={personal.proteinPct}
          />
          <CoverageBar
            label="Lipides"
            valueG={dailyAverage.lipidesG}
            pct={personal.lipidesPct}
          />
          <CoverageBar
            label="Glucides"
            valueG={dailyAverage.glucidesG}
            pct={personal.glucidesPct}
          />
          <p className="text-[10px] text-campus-muted">
            % de ton objectif personnalisé (profil corporel).
          </p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-campus-terracotta/10 p-2.5 text-[11px] text-campus-muted">
          Complète ton profil (sexe, poids, taille, âge) pour comparer ces
          chiffres à ton objectif personnalisé.
        </p>
      )}

      <div className="mt-4 space-y-3 border-t border-campus-sand pt-4">
        <CoverageBar
          label="Sucres"
          valueG={dailyAverage.sucresG}
          pct={reference.sucresPct}
        />
        <CoverageBar
          label="Acides gras saturés"
          valueG={dailyAverage.satureesG}
          pct={reference.satureesPct}
        />
        <CoverageBar
          label="Sel"
          valueG={dailyAverage.selG}
          pct={reference.selPct}
        />
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-campus-ink">Fibres</p>
          <p className="text-xs font-semibold text-campus-ink">
            {dailyAverage.fibresG}g
          </p>
        </div>
        <p className="text-[10px] text-campus-muted">
          % du repère de référence UE pour un adulte (base{" "}
          {EU_REFERENCE_INTAKE_2000KCAL.kcal} kcal/j, règlement (UE)
          n°1169/2011). Pas de repère officiel pour les fibres — valeur
          affichée brute.
        </p>
      </div>

      {itemsExcluded > 0 && (
        <p className="mt-3 text-[10px] text-campus-muted">
          {itemsExcluded} article{itemsExcluded > 1 ? "s" : ""} non
          comptabilisé{itemsExcluded > 1 ? "s" : ""} (condiment dosé
          librement, ou vendu à l&apos;unité sans poids précis connu).
        </p>
      )}
    </div>
  );
}
