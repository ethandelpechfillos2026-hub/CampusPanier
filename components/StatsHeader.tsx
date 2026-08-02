"use client";

import { useEffect, useState } from "react";
import BadgesPanel from "@/components/BadgesPanel";
import CelebrationOverlay from "@/components/CelebrationOverlay";
import HistoryPanel from "@/components/HistoryPanel";
import {
  Achievement,
  getNewlyUnlockedAchievements,
  markAchievementsSeen,
} from "@/lib/achievements";
import { formatPrice } from "@/lib/generateShoppingList";
import { DashboardStats, getDashboardStats } from "@/lib/stats";
import { ShoppingListResult } from "@/lib/types";
import { computeXp, getLevelInfo } from "@/lib/xp";

interface StatsHeaderProps {
  result: ShoppingListResult;
}

const EMPTY_STATS: DashboardStats = {
  streakWeeks: 0,
  listsGenerated: 0,
  recipesTried: 0,
  listsCompleted: 0,
};

export default function StatsHeader({ result }: StatsHeaderProps) {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [showBadges, setShowBadges] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [celebration, setCelebration] = useState<Achievement | null>(null);

  useEffect(() => {
    const freshStats = getDashboardStats();
    setStats(freshStats);

    const newlyUnlocked = getNewlyUnlockedAchievements(freshStats);
    if (newlyUnlocked.length > 0) {
      setCelebration(newlyUnlocked[0]);
    }
  }, [result]);

  function dismissCelebration() {
    setCelebration(null);
    markAchievementsSeen(stats);
  }

  const spentPercent = Math.min(
    100,
    Math.round((result.total / result.budget) * 100)
  );
  const weeklySavings = Math.max(0, result.remaining);
  const xp = computeXp(stats);
  const levelInfo = getLevelInfo(xp);

  return (
    <>
      <div
        className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #F4A261 0%, #E07A5F 55%, #C9483A 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/85">Ta progression</p>
            {stats.streakWeeks > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                🔥 {stats.streakWeeks} semaine{stats.streakWeeks > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <p className="mt-3 text-xs uppercase tracking-wide text-white/70">
            Économisé cette semaine
          </p>
          <p className="text-3xl font-extrabold leading-tight">
            {formatPrice(weeklySavings)}
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

          <div className="mt-4 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>
                {levelInfo.icon} {levelInfo.title}
              </span>
              <span className="text-white/80">
                {levelInfo.xpIntoLevel}/{levelInfo.xpForNextLevel} XP
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
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

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setShowBadges(true)}
              className="flex-1 rounded-full bg-white/20 py-2 text-xs font-bold backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              🏆 Mes badges
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              className="flex-1 rounded-full bg-white/20 py-2 text-xs font-bold backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              📊 Historique
            </button>
          </div>
        </div>
      </div>

      {showBadges && (
        <BadgesPanel stats={stats} onClose={() => setShowBadges(false)} />
      )}

      {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}

      {celebration && (
        <CelebrationOverlay
          achievement={celebration}
          onDismiss={dismissCelebration}
        />
      )}
    </>
  );
}
