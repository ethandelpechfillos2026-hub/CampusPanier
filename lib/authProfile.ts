import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

export async function getCloudProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function saveCloudProfile(uid: string, profile: UserProfile): Promise<void> {
  await setDoc(doc(db, "profiles", uid), profile);
}
