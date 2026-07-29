"use client";

import { useEffect } from "react";
import Mascot from "@/components/Mascot";
import { Achievement } from "@/lib/achievements";
import { playCelebrationSound } from "@/lib/sound";

interface CelebrationOverlayProps {
  achievement: Achievement;
  onDismiss: () => void;
}

const CONFETTI_COLORS = ["#E07A5F", "#F4A261", "#81B29A", "#3D405B", "#F2C14E"];

export default function CelebrationOverlay({
  achievement,
  onDismiss,
}: CelebrationOverlayProps) {
  useEffect(() => {
    playCelebrationSound();
  }, [achievement.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="relative w-full max-w-[320px] overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${(i * 6.2) % 100}%`,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 6) * 0.12}s`,
              }}
            />
          ))}
        </div>

        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-wide text-campus-terracotta">
            Nouveau badge débloqué
          </p>
          <div className="my-3 flex justify-center">
            <Mascot mood="excited" size={92} />
          </div>
          <p className="text-4xl">{achievement.icon}</p>
          <p className="mt-2 text-lg font-bold text-campus-ink">
            {achievement.label}
          </p>
          <p className="mt-1 text-sm text-campus-muted">
            {achievement.description}
          </p>
          <button type="button" onClick={onDismiss} className="btn-primary mt-5">
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}
