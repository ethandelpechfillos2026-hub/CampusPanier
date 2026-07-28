"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/generateShoppingList";
import { DashboardStats, getDashboardStats } from "@/lib/stats";
import { ShoppingListResult } from "@/lib/types";

interface StatsHeaderProps {
  result: ShoppingListResult;
}

const EMPTY_STATS: DashboardStats = {
  streakWeeks: 0,
  savedThisMonth: 0,
  listsGenerated: 0,
  recipesTried: 0,
};

export default function StatsHeader({ result }: StatsHeaderProps) {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);

  useEffect(() => {
    setStats(getDashboardStats());
  }, [result]);

  const spentPercent = Math.min(
    100,
    Math.round((result.total / result.budget) * 100)
  );

  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-campus-terracotta via-[#E0885F] to-campus-terracottaDark p-5 text-white shadow-lg shadow-campus-terracotta/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/85">Ta progression</p>
        {stats.streakWeeks > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
            🔥 {stats.streakWeeks} semaine{stats.streakWeeks > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs uppercase tracking-wide text-white/70">
        Économisé ce mois-ci
      </p>
      <p className="text-3xl font-extrabold leading-tight">
        {formatPrice(stats.savedThisMonth)}
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold text-white/85">
          <span>
            Budget de la semaine : {formatPrice(result.total)} /{" "}
            {formatPrice(result.budget)}
          </span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${spentPercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-white/85">
          {result.isOverBudget
            ? `${formatPrice(Math.abs(result.remaining))} de dépassement`
            : `${formatPrice(result.remaining)} restants ✓`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
          <p className="text-lg font-extrabold leading-tight">
            {stats.listsGenerated}
          </p>
          <p className="text-[11px] font-medium text-white/80">
            liste{stats.listsGenerated > 1 ? "s" : ""} générée
            {stats.listsGenerated > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
          <p className="text-lg font-extrabold leading-tight">
            {stats.recipesTried}
          </p>
          <p className="text-[11px] font-medium text-white/80">
            recette{stats.recipesTried > 1 ? "s" : ""} essayée
            {stats.recipesTried > 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
