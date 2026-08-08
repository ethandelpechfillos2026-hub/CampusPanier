import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SharedList, SharedListItem, ShoppingListResult } from "@/lib/types";

const COLLECTION = "sharedLists";

// Quelle liste partagée cet appareil suit actuellement — stocké en local,
// pas en base, car "être dans telle liste" est propre à cet appareil/ce
// navigateur, pas au compte (on ne veut pas forcer la resynchro partout).
const ACTIVE_LIST_KEY = "campus-panier-shared-list-id";

export function getActiveSharedListId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_LIST_KEY);
}

export function setActiveSharedListId(listId: string | null): void {
  if (typeof window === "undefined") return;
  if (listId) window.localStorage.setItem(ACTIVE_LIST_KEY, listId);
  else window.localStorage.removeItem(ACTIVE_LIST_KEY);
}

// Sans caractères ambigus (0/O, 1/I) pour que le code reste facile à
// retaper depuis un autre téléphone.
const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

function generateListId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Crée une nouvelle liste partagée à partir de la liste de courses actuelle
// de l'utilisateur·rice, qui devient propriétaire. Les colocataires la
// rejoignent ensuite avec le code d'invitation à 6 caractères.
export async function createSharedList(
  ownerId: string,
  ownerName: string,
  result: ShoppingListResult
): Promise<SharedList> {
  const items: Record<string, SharedListItem> = {};
  for (const { product } of result.items) {
    items[product.id] = {
      name: product.shortName ?? product.name,
      price: product.price,
      checked: false,
      checkedBy: null,
    };
  }

  const sharedList: SharedList = {
    id: generateListId(),
    ownerId,
    ownerName,
    memberIds: [ownerId],
    memberNames: { [ownerId]: ownerName },
    inviteCode: generateInviteCode(),
    budget: result.budget,
    total: result.total,
    createdAt: Date.now(),
    items,
    // Capturé depuis "Ma liste" au moment de la création — c'est ce tableau
    // (et non l'ordre des clés de `items`) qui fixe l'ordre d'affichage pour
    // tout le monde.
    itemOrder: result.items.map(({ product }) => product.id),
  };

  await setDoc(doc(db, COLLECTION, sharedList.id), sharedList);
  return sharedList;
}

// Recherche une liste partagée par son code d'invitation (insensible à la
// casse). Retourne null si aucune liste ne correspond.
export async function findSharedListByCode(
  inviteCode: string
): Promise<SharedList | null> {
  const normalized = inviteCode.trim().toUpperCase();
  const q = query(
    collection(db, COLLECTION),
    where("inviteCode", "==", normalized)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as SharedList;
}

// Ajoute l'utilisateur·rice courant·e aux membres — n'écrit QUE
// memberIds/memberNames, jamais les autres champs, pour rester compatible
// avec des règles de sécurité Firestore restrictives (un nouvel arrivant ne
// doit pouvoir modifier que sa propre entrée).
export async function joinSharedList(
  listId: string,
  userId: string,
  userName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, listId), {
    memberIds: arrayUnion(userId),
    [`memberNames.${userId}`]: userName,
  });
}

// Coche/décoche un article — mise à jour atomique par chemin Firestore,
// sans relire tout le document, pour éviter qu'un colocataire écrase la
// coche d'un autre en cochant au même moment.
export async function toggleSharedListItem(
  listId: string,
  productId: string,
  checked: boolean,
  userName: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, listId), {
    [`items.${productId}.checked`]: checked,
    [`items.${productId}.checkedBy`]: checked ? userName : null,
  });
}

// Quitte UNE liste partagée précise (bouton "Quitter cette liste") — retire
// l'utilisateur·rice de `memberIds`/`memberNames` pour que les autres
// colocataires ne la voient plus listée comme membre actif, plutôt que de se
// contenter d'arrêter de suivre la liste sur cet appareil (ce que faisait ce
// bouton avant : la personne restait indéfiniment listée aux yeux des autres).
// Ne supprime jamais la liste elle-même ni les articles déjà cochés.
export async function leaveSharedList(listId: string, userId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, listId), {
    memberIds: arrayRemove(userId),
    [`memberNames.${userId}`]: deleteField(),
  });
}

// Suppression de compte (droit à l'effacement RGPD) : retire l'utilisateur·rice
// de toutes les listes partagées où iel figure comme membre. Best-effort —
// ne supprime jamais la liste elle-même ni les articles déjà cochés (les
// autres colocataires en dépendent), seulement le lien vers ce compte.
// Ne touche pas non plus au champ `ownerId`/`ownerName` : si la personne qui
// se supprime était propriétaire, la liste reste consultable par les autres
// membres, avec le nom du/de la propriétaire figé tel qu'il était.
export async function leaveAllSharedLists(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION),
    where("memberIds", "array-contains", userId)
  );
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map((docSnap) =>
      updateDoc(docSnap.ref, {
        memberIds: arrayRemove(userId),
        [`memberNames.${userId}`]: deleteField(),
      })
    )
  );
}

export async function getSharedList(listId: string): Promise<SharedList | null> {
  const snap = await getDoc(doc(db, COLLECTION, listId));
  return snap.exists() ? (snap.data() as SharedList) : null;
}

// Abonnement temps réel : ré-appelle `onChange` à chaque mise à jour de la
// liste (coche par un·e autre colocataire, nouvel arrivant...). Retourne la
// fonction de désabonnement à appeler dans le cleanup du useEffect.
export function subscribeToSharedList(
  listId: string,
  onChange: (list: SharedList | null) => void
): () => void {
  return onSnapshot(doc(db, COLLECTION, listId), (snap) => {
    onChange(snap.exists() ? (snap.data() as SharedList) : null);
  });
}
