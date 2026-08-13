import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Locale } from "@/lib/i18n/locale";
import { Theme, UserProfile } from "@/lib/types";

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
    // Profils créés avant l'ajout de ce champ : aucun échange mémorisé.
    productSubstitutions: data.productSubstitutions ?? null,
    // Profils créés avant l'ajout de ce champ, ou dernière génération non
    // restreinte (voir lib/types.ts) : rien à réappliquer au resume.
    lastAllowedProductIds: Array.isArray(data.lastAllowedProductIds)
      ? data.lastAllowedProductIds
      : null,
    // Profils créés avant l'ajout du thème/de la langue (voir lib/i18n/) :
    // pas de préférence enregistrée côté compte — LanguageProvider/
    // ThemeProvider retombent sur localStorage puis sur system/fr.
    theme: data.theme ?? null,
    language: data.language ?? null,
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

// Mémorise le budget ET la restriction d'ingrédients éventuelle (parcours
// "Je choisis mes ingrédients", voir lib/generateShoppingList.ts) de la
// dernière liste générée, à même le profil Firestore — c'est ce qui permet
// de retomber directement sur LA MÊME "Ma liste" à la prochaine connexion
// avec ce même compte Google, peu importe l'appareil. Avant l'ajout du
// second paramètre (retour d'audit, 13 août 2026), une liste construite à
// partir d'ingrédients choisis était silencieusement remplacée par une
// liste non restreinte au resume — le budget seul ne suffit pas à
// reproduire la même liste dans ce cas. Mise à jour ciblée (pas un
// `saveCloudProfile` complet) pour ne jamais écraser par erreur un autre
// champ du profil avec une copie locale périmée.
export async function updateLastBudget(
  uid: string,
  budget: number,
  allowedProductIds: string[] | null = null
): Promise<void> {
  await updateDoc(doc(db, "profiles", uid), {
    lastBudget: budget,
    lastAllowedProductIds: allowedProductIds,
  });
}

// Mémorise les échanges de produits faits depuis "Ma liste" (voir
// ResultsContent.tsx), pour qu'ils survivent à une reconnexion — même
// principe et même mise à jour ciblée que updateLastBudget ci-dessus.
export async function updateProductSubstitutions(
  uid: string,
  substitutions: Record<string, string>
): Promise<void> {
  await updateDoc(doc(db, "profiles", uid), { productSubstitutions: substitutions });
}

// Synchronise le thème/la langue choisis sur le compte (voir lib/i18n/
// LanguageContext.tsx, components/ThemeProvider.tsx) — appelée dès qu'une
// personne connectée change l'un des deux dans les réglages, pour que le
// choix suive le compte d'un appareil à l'autre comme lastBudget. Mise à
// jour ciblée (pas un saveCloudProfile complet), même principe que
// updateLastBudget ci-dessus. N'échoue pas si le document profil n'existe
// pas encore (ex: réglage changé avant la fin du premier profil) — la
// prochaine sauvegarde complète (saveCloudProfile) inclura la valeur
// mémorisée en localStorage entre-temps.
export async function updateDisplaySettings(
  uid: string,
  settings: { theme?: Theme; language?: Locale }
): Promise<void> {
  try {
    await updateDoc(doc(db, "profiles", uid), settings);
  } catch {
    // Document profil pas encore créé — pas grave, voir commentaire ci-dessus.
  }
}
