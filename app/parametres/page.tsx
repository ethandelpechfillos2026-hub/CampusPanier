"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteUser, onAuthStateChanged, signOut, type User } from "firebase/auth";
import { deleteCloudProfile } from "@/lib/authProfile";
import { auth } from "@/lib/firebase";
import { leaveAllSharedLists, setActiveSharedListId } from "@/lib/sharedList";
import PhoneFrame from "@/components/PhoneFrame";

// Toutes les clés localStorage utilisées par l'application (voir
// lib/favorites.ts, lib/stats.ts, lib/sharedList.ts, lib/achievements.ts) —
// effacées lors de la suppression de compte pour un effacement complet côté
// appareil, même celles issues de code aujourd'hui inutilisé.
const LOCAL_STORAGE_KEYS = [
  "campus-panier-favorites",
  "campus-panier-list-history",
  "campus-panier-recipes-viewed",
  "campus-panier-lists-completed",
  "campus-panier-shared-list-id",
  "campus-panier-achievements-seen",
  "campus-panier-profile",
  "campus-panier-preferences",
];

function clearLocalData() {
  LOCAL_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

const CONFIRM_WORD = "SUPPRIMER";

export default function ParametresPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCloudProfile(user.uid);
      await leaveAllSharedLists(user.uid);
      setActiveSharedListId(null);
      clearLocalData();
      await deleteUser(user);
      router.push("/");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        setNeedsReauth(true);
        setError(
          "Pour des raisons de sécurité, Google demande une connexion récente avant de supprimer le compte. Déconnecte-toi puis reconnecte-toi, ensuite reviens ici pour réessayer."
        );
      } else {
        setError("La suppression a échoué. Réessaie, ou contacte le support si le problème persiste.");
        console.error("[CampusPanier] Erreur suppression de compte:", err);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleReauthSignOut() {
    await signOut(auth);
    router.push("/");
  }

  return (
    <PhoneFrame>
    <div className="flex-1 overflow-y-auto px-5 py-5">
      <div className="space-y-6 pb-8">
        <div>
          <Link href="/" className="text-xs font-semibold text-campus-terracotta underline">
            ← Retour à l&apos;app
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-campus-ink">Réglages</h1>
        </div>

        {user && (
          <p className="text-sm text-campus-muted">
            Connecté·e en tant que <strong className="text-campus-ink">{user.email}</strong>
          </p>
        )}

        <section className="space-y-2 rounded-2xl border-2 border-campus-sand bg-white p-4">
          <h2 className="text-sm font-bold text-campus-ink">Documents légaux</h2>
          <div className="flex flex-col gap-1.5 text-sm">
            <Link href="/mentions-legales" className="font-semibold text-campus-terracotta underline">
              Mentions légales
            </Link>
            <Link href="/cgu" className="font-semibold text-campus-terracotta underline">
              Conditions générales d&apos;utilisation
            </Link>
            <Link href="/confidentialite" className="font-semibold text-campus-terracotta underline">
              Politique de confidentialité
            </Link>
            <Link href="/cookies" className="font-semibold text-campus-terracotta underline">
              Cookies et traceurs
            </Link>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-bold text-red-900">Supprimer mon compte</h2>
          <p className="text-xs leading-relaxed text-red-900/80">
            Cette action supprime définitivement : ton profil (régime, allergies, calories, poids/taille/âge...),
            ton compte de connexion Google associé à CampusPanier, et toutes les données enregistrées uniquement sur
            cet appareil (favoris, historique, recettes vues). Si tu es membre d&apos;une liste partagée, ton nom en
            est retiré mais la liste reste visible aux autres colocataires. Cette action est irréversible.
          </p>

          {!needsReauth ? (
            <>
              <label className="block text-xs font-semibold text-red-900">
                Tape {CONFIRM_WORD} pour confirmer
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-xl border-2 border-red-300 bg-white px-3 py-2 text-sm"
                placeholder={CONFIRM_WORD}
              />
              <button
                type="button"
                disabled={confirmText !== CONFIRM_WORD || deleting || !user}
                onClick={handleDeleteAccount}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? "Suppression en cours..." : "Supprimer définitivement mon compte"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleReauthSignOut}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Se déconnecter pour réessayer ensuite
            </button>
          )}

          {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
        </section>
      </div>
    </div>
    </PhoneFrame>
  );
}
