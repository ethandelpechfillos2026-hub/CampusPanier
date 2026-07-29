// Petits sons synthétisés à la volée (Web Audio API) — pas de fichier audio à
// héberger, ça marche même hors-ligne dans la PWA. Un "clic" satisfaisant
// joué sur chaque bouton de l'app (voir CampusPanierApp.tsx), et un petit
// carillon de récompense joué au déblocage d'un badge.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!audioCtx) audioCtx = new AudioCtxClass();
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {
      // Ignoré — certains navigateurs refusent hors d'un vrai geste
      // utilisateur, dans ce cas on ne joue simplement pas le son.
    });
  }
  return audioCtx;
}

function tone(
  ctx: AudioContext,
  options: {
    frequency: number;
    startTime: number;
    duration: number;
    type?: OscillatorType;
    peakGain?: number;
  }
): void {
  const { frequency, startTime, duration, type = "sine", peakGain = 0.16 } =
    options;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function playClickSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, {
    frequency: 1050,
    startTime: now,
    duration: 0.09,
    type: "triangle",
    peakGain: 0.14,
  });
  tone(ctx, {
    frequency: 220,
    startTime: now,
    duration: 0.12,
    type: "sine",
    peakGain: 0.07,
  });
}

export function playCelebrationSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // do-mi-sol-do, ascendant
  notes.forEach((frequency, index) => {
    tone(ctx, {
      frequency,
      startTime: now + index * 0.09,
      duration: 0.22,
      type: "triangle",
      peakGain: 0.16,
    });
  });
}
