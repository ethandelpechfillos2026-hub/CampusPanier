import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

export async function getCloudProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "profiles", uid));
  if (!snap.exists()) return null;

  const data = snap.data() as UserProfile;
  // Migration défensive : les profils enregistrés avant l'introduction de
  // `canteenDays` (ex-`eatsLunchAtCanteen` booléen) n'ont pas ce champ en
  // base. Sans ce filet, `canteenDays.includes(...)` planterait au premier
  // rendu pour ces profils existants.
  return {
    ...data,
    canteenDays: Array.isArray(data.canteenDays) ? data.canteenDays : [],
  };
}

export async function saveCloudProfile(uid: string, profile: UserProfile): Promise<void> {
  await setDoc(doc(db, "profiles", uid), profile);
}
