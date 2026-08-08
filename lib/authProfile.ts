import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

export async function getCloudProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "profiles", uid));
  if (!snap.exists()) return null;

  const data = snap.data() as UserProfile;
  // Migration défensive : les profils enregistrés avant l'introduction de
  // `canteenDays` (ex-`eatsLunchAtCanteen` booléen) ou de
  // `preferredEnseigne`/`preferredZone` n'ont pas ces champs en base. Sans ce
  // filet, `canteenDays.includes(...)` planterait au premier rendu pour ces
  // profils existants.
  return {
    ...data,
    canteenDays: Array.isArray(data.canteenDays) ? data.canteenDays : [],
    preferredEnseigne: data.preferredEnseigne ?? null,
    preferredZone: data.preferredZone ?? null,
    // Comptes créés avant l'ajout du consentement santé explicite (voir
    // lib/types.ts) : on ne suppose jamais un consentement qui n'a pas été
    // recueilli — ProfileForm le redemandera à la prochaine visite de
    // l'étape 1.
    healthConsent: data.healthConsent ?? false,
    healthConsentAt: data.healthConsentAt ?? null,
    // Profils créés avant l'ajout de ce champ (voir lib/types.ts) : pas de
    // dernière liste connue, retombe normalement sur l'écran budget.
    lastBudget: data.lastBudget ?? null,
  };
}

// Droit à l'effacement RGPD (article 17) — supprime le document de profil
// Firestore. Utilisé par le parcours de suppression de compte
// (app/parametres/page.tsx), en plus de la suppression du compte
// d'authentification Firebase elle-même.
export async function deleteCloudProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, "profiles", uid));
}

export async function saveCloudProfile(uid: string, profile: UserProfile): Promise<void> {
  await setDoc(doc(db, "profiles", uid), profile);
}

// Mémorise le budget de la dernière liste générée, à même le profil
// Firestore — c'est ce qui permet de retomber directement sur "Ma liste" à
// la prochaine connexion avec ce même compte Google, peu importe
// l'appareil. Mise à jour ciblée (pas un `saveCloudProfile` complet) pour ne
// jamais écraser par erreur un autre champ du profil avec une copie locale
// périmée.
export async function updateLastBudget(uid: string, budget: number): Promise<void> {
  await updateDoc(doc(db, "profiles", uid), { lastBudget: budget });
}
