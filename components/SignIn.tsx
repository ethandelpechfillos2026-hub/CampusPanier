"use client";

import { useEffect, useState } from "react";
import { getRedirectResult, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SignIn() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (!result) {
          // Pas de redirection en cours : normal au premier chargement.
          return;
        }
      })
      .catch((err) => {
        const code = err?.code ?? "inconnu";
        const message = err?.message ?? String(err);
        setError(`Erreur Firebase (${code}) : ${message}`);
        console.error("Erreur getRedirectResult:", err);
      });
  }, []);

  async function handleSignIn() {
    console.log("[CampusPanier] clic sur Continuer avec Google, lancement de signInWithRedirect...");
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
      console.log("[CampusPanier] signInWithRedirect résolu (ne devrait pas s'afficher avant la navigation).");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "inconnu";
      setError(`Erreur au lancement (${code}). Réessaie.`);
      console.error("Erreur signInWithRedirect:", err);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-campus-terracotta text-3xl text-white">
        🛒
      </span>
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">Bienvenue sur CampusPanier</h1>
        <p className="mt-2 text-sm text-campus-muted">
          Connecte-toi pour qu&apos;on retienne tes habitudes alimentaires
          d&apos;une fois sur l&apos;autre.
        </p>
      </div>
      <button type="button" onClick={handleSignIn} className="btn-primary">
        Continuer avec Google
      </button>
      <p className="max-w-xs text-xs text-campus-muted">
        On utilise Google uniquement pour créer ton compte en toute sécurité.
        Aucune donnée n&apos;est revendue ni partagée.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
