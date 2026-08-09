import {
  computePersonalCoverage,
  computeReferenceCoverage,
  computeShoppingListNutrition,
  EU_REFERENCE_INTAKE_2000KCAL,
} from "@/lib/nutritionSummary";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { MacroTargets } from "@/lib/macros";
import { ShoppingListItem } from "@/lib/types";

interface NutritionSummaryCardProps {
  items: ShoppingListItem[];
  macroTargets: MacroTargets | null;
  // Voir lib/generateShoppingList.ts (estimateExtraBudgetForCalorieTarget) —
  // budget en plus estimé nécessaire pour atteindre l'objectif calorique,
  // ou signal que même beaucoup plus de budget n'y suffirait pas. Absents
  // (undefined) si l'appelant n'a pas encore cette donnée (ex : ancien
  // résultat mémorisé avant l'ajout de ce champ) — traité comme "pas
  // d'estimation disponible", pas comme une erreur.
  extraBudgetForCalorieTarget?: number | null;
  calorieTargetHardToReach?: boolean;
}

// Une ligne "valeur / cible (%)" par nutriment. Affiche toujours la cible à
// côté de la valeur — un pourcentage seul ("117%") ne veut rien dire sans
// savoir de quoi il est le pourcentage (retour utilisateur, 8 août 2026).
// `unit` distingue kcal de g : coller "g" à une valeur en kcal était le bug
// à l'origine de la confusion ("2069 grammes" au lieu de "2069 kcal").
function CoverageBar({
  label,
  valueG,
  targetG,
  unit = "g",
  pct,
  overThreshold = 120,
}: {
  label: string;
  valueG: number;
  targetG?: number | null;
  unit?: string;
  pct: number | null;
  overThreshold?: number;
}) {
  const { t } = useTranslation();
  const pctColor =
    pct === null
      ? "text-campus-muted"
      : pct >= overThreshold
        ? "text-red-600 dark:text-red-400"
        : pct >= 100
          ? "text-amber-600 dark:text-amber-400"
          : "text-campus-ink";
  const barColor =
    pct !== null && pct >= overThreshold ? "bg-red-500 dark:bg-red-600" : "bg-campus-terracotta";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-campus-ink">{label}</p>
        <p className="text-xs">
          <span className="font-semibold text-campus-ink">
            {valueG}
            {unit}
          </span>
          {targetG != null && (
            <span className="text-campus-muted">
              {" "}
              / {targetG}
              {unit} {t("nutritionSummary.target")}
            </span>
          )}
          {pct !== null && (
            <span className={`ml-1 font-semibold ${pctColor}`}>({pct}%)</span>
          )}
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
//
// Deux bases de comparaison différentes cohabitent volontairement dans
// cette carte : la partie du haut compare à TON objectif (calculé depuis
// ton profil), la partie du bas compare à un repère UE générique (le même
// pour tout le monde, indépendant de ton profil). D'où les deux titres de
// section distincts plutôt qu'une seule liste — pour ne pas laisser croire
// que les 7 lignes répondent à la même question.
export default function NutritionSummaryCard({
  items,
  macroTargets,
  extraBudgetForCalorieTarget = null,
  calorieTargetHardToReach = false,
}: NutritionSummaryCardProps) {
  const { t } = useTranslation();
  const summary = computeShoppingListNutrition(items);
  const { dailyAverage, itemsCounted, itemsExcluded, totalItems } = summary;

  if (itemsCounted === 0) {
    return null;
  }

  const personal = computePersonalCoverage(dailyAverage, macroTargets);
  const reference = computeReferenceCoverage(dailyAverage);

  return (
    <div className="rounded-2xl border border-campus-sand bg-campus-surface p-5">
      <h2 className="text-sm font-bold text-campus-ink">
        {t("nutritionSummary.title")}
      </h2>
      <p className="mt-0.5 text-[11px] text-campus-muted">
        {t("nutritionSummary.calculatedOn", {
          counted: itemsCounted,
          total: totalItems,
          plural: totalItems > 1 ? "s" : "",
        })}
      </p>

      {macroTargets ? (
        <div className="mt-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-campus-terracotta">
            {t("nutritionSummary.personalTitle")}
          </p>
          <CoverageBar
            label={t("nutritionSummary.calories")}
            valueG={Math.round(dailyAverage.kcal)}
            targetG={macroTargets.calories}
            unit=" kcal"
            pct={personal.kcalPct}
          />
          <CoverageBar
            label={t("profileForm.proteins")}
            valueG={dailyAverage.proteinG}
            targetG={macroTargets.proteinG}
            pct={personal.proteinPct}
          />
          <CoverageBar
            label={t("profileForm.lipids")}
            valueG={dailyAverage.lipidesG}
            targetG={macroTargets.lipidesG}
            pct={personal.lipidesPct}
          />
          <CoverageBar
            label={t("profileForm.carbs")}
            valueG={dailyAverage.glucidesG}
            targetG={macroTargets.glucidesG}
            pct={personal.glucidesPct}
          />
          {extraBudgetForCalorieTarget != null && (
            <p className="rounded-xl bg-campus-terracotta/10 p-2.5 text-[11px] text-campus-ink">
              {t("nutritionSummary.extraBudgetHintPrefix")}{" "}
              <span className="font-bold">
                +{extraBudgetForCalorieTarget}€/semaine
              </span>{" "}
              {t("nutritionSummary.extraBudgetHintSuffix")}
            </p>
          )}
          {calorieTargetHardToReach && (
            <p className="rounded-xl bg-campus-terracotta/10 p-2.5 text-[11px] text-campus-ink">
              {t("nutritionSummary.hardToReach")}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-campus-terracotta/10 p-2.5 text-[11px] text-campus-muted">
          {t("nutritionSummary.completeProfile")}
        </p>
      )}

      <div className="mt-4 space-y-3 border-t border-campus-sand pt-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-campus-muted">
          {t("nutritionSummary.referenceTitle")}
        </p>
        <CoverageBar
          label={t("nutritionSummary.sugars")}
          valueG={dailyAverage.sucresG}
          targetG={EU_REFERENCE_INTAKE_2000KCAL.sucresG}
          pct={reference.sucresPct}
        />
        <CoverageBar
          label={t("nutritionSummary.saturatedFat")}
          valueG={dailyAverage.satureesG}
          targetG={EU_REFERENCE_INTAKE_2000KCAL.satureesG}
          pct={reference.satureesPct}
        />
        <CoverageBar
          label={t("nutritionSummary.salt")}
          valueG={dailyAverage.selG}
          targetG={EU_REFERENCE_INTAKE_2000KCAL.selG}
          pct={reference.selPct}
        />
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-campus-ink">{t("nutritionSummary.fibres")}</p>
          <p className="text-xs font-semibold text-campus-ink">
            {dailyAverage.fibresG}g
            <span className="ml-1 font-normal text-campus-muted">
              {t("nutritionSummary.noOfficialTarget")}
            </span>
          </p>
        </div>
        <p className="text-[10px] text-campus-muted">
          {t("nutritionSummary.euReferenceHint", { kcal: EU_REFERENCE_INTAKE_2000KCAL.kcal })}
        </p>
      </div>

      {itemsExcluded > 0 && (
        <p className="mt-3 text-[10px] text-campus-muted">
          {t("nutritionSummary.excludedItems", {
            count: itemsExcluded,
            plural: itemsExcluded > 1 ? "s" : "",
          })}
        </p>
      )}
    </div>
  );
}
