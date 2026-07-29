"use client";

import Mascot from "@/components/Mascot";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { DashboardStats } from "@/lib/stats";

interface BadgesPanelProps {
  stats: DashboardStats;
  onClose: () => void;
}

export default function BadgesPanel({ stats, onClose }: BadgesPanelProps) {
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.isUnlocked(stats)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-[420px] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Mascot mood="happy" size={48} />
            <div>
              <h2 className="text-lg font-bold text-campus-ink">Tes badges</h2>
              <p className="text-xs text-campus-muted">
                {unlockedCount}/{ACHIEVEMENTS.length} débloqués
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-full bg-campus-sand px-2.5 py-1 text-sm font-bold text-campus-ink"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = achievement.isUnlocked(stats);
            return (
              <div
                key={achievement.id}
                className={`rounded-2xl border p-3 text-center transition-colors ${
                  unlocked
                    ? "border-campus-terracotta/40 bg-campus-terracotta/10"
                    : "border-campus-sand bg-campus-sand/30"
                }`}
              >
                <span
                  className={`text-3xl ${
                    unlocked ? "" : "opacity-40 grayscale"
                  }`}
                >
                  {achievement.icon}
                </span>
                <p
                  className={`mt-1.5 text-xs font-bold ${
                    unlocked ? "text-campus-ink" : "text-campus-muted"
                  }`}
                >
                  {achievement.label}
                </p>
                <p className="mt-0.5 text-[11px] text-campus-muted">
                  {achievement.description}
                </p>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={onClose} className="btn-secondary mt-4">
          Fermer
        </button>
      </div>
    </div>
  );
}
