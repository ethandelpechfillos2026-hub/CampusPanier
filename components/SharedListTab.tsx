"use client";

import { useEffect, useState } from "react";
import Mascot from "@/components/Mascot";
import { formatPrice, products } from "@/lib/generateShoppingList";
import {
  createSharedList,
  findSharedListByCode,
  getActiveSharedListId,
  joinSharedList,
  leaveSharedList,
  setActiveSharedListId,
  subscribeToSharedList,
  toggleSharedListItem,
} from "@/lib/sharedList";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  ProductCategory,
  SharedList,
  SharedListItem,
  ShoppingListResult,
} from "@/lib/types";

interface SharedListTabProps {
  result: ShoppingListResult;
  userId: string;
  userName: string;
}

interface ItemGroup {
  category: ProductCategory;
  entries: [string, SharedListItem][];
}

// Range les articles de la liste partagée par rayon, comme partout ailleurs
// dans l'app — on retrouve le rayon via le catalogue produits en local
// (les articles de la liste partagée ne stockent que id/nom/prix/coché).
//
// Important : Firestore ne garantit PAS l'ordre des champs d'une map au
// moment de la lecture (contrairement à un tableau) — deux appareils qui
// lisent le même document peuvent recevoir `items` dans un ordre différent.
// `itemOrder` est un TABLEAU figé à la création (à partir de "Ma liste"),
// dont Firestore préserve l'ordre — on trie chaque rayon selon la position
// du produit dans ce tableau, jamais selon l'ordre des clés de `items`, pour
// que tous les colocataires voient exactement le même ordre.
function groupSharedItems(
  items: Record<string, SharedListItem>,
  itemOrder: string[]
): ItemGroup[] {
  const byCategory = new Map<ProductCategory, [string, SharedListItem][]>();

  for (const entry of Object.entries(items)) {
    const [productId] = entry;
    const product = products.find((p) => p.id === productId);
    if (!product) continue;
    const list = byCategory.get(product.category) ?? [];
    list.push(entry);
    byCategory.set(product.category, list);
  }

  // Repli sur l'ordre du catalogue produits si `itemOrder` est absent (listes
  // créées avant l'ajout de ce champ) ou si un article n'y figure pas.
  function sortKey(productId: string): number {
    const orderIndex = itemOrder.indexOf(productId);
    if (orderIndex !== -1) return orderIndex;
    return 1000 + products.findIndex((p) => p.id === productId);
  }

  for (const list of Array.from(byCategory.values())) {
    list.sort((a, b) => sortKey(a[0]) - sortKey(b[0]));
  }

  return CATEGORY_ORDER.filter((category) => byCategory.has(category)).map(
    (category) => ({
      category,
      entries: byCategory.get(category)!,
    })
  );
}

export default function SharedListTab({
  result,
  userId,
  userName,
}: SharedListTabProps) {
  const [listId, setListId] = useState<string | null | undefined>(undefined);
  const [sharedList, setSharedList] = useState<SharedList | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // `undefined` = pas encore lu le localStorage (évite un flash de l'écran
  // "créer/rejoindre" avant qu'on sache qu'une liste est déjà suivie).
  useEffect(() => {
    setListId(getActiveSharedListId());
  }, []);

  useEffect(() => {
    if (!listId) {
      setSharedList(null);
      return;
    }
    const unsubscribe = subscribeToSharedList(listId, (list) => {
      setSharedList(list);
    });
    return () => unsubscribe();
  }, [listId]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const created = await createSharedList(userId, userName, result);
      setActiveSharedListId(created.id);
      setListId(created.id);
    } catch (err) {
      console.error("[CampusPanier] Erreur création liste partagée:", err);
      setError("Impossible de créer la liste partagée. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (joinCode.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const found = await findSharedListByCode(joinCode);
      if (!found) {
        setError("Aucune liste ne correspond à ce code. Vérifie-le.");
        return;
      }
      if (!found.memberIds.includes(userId)) {
        await joinSharedList(found.id, userId, userName);
      }
      setActiveSharedListId(found.id);
      setListId(found.id);
    } catch (err) {
      console.error("[CampusPanier] Erreur pour rejoindre la liste:", err);
      setError("Impossible de rejoindre cette liste. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    const currentListId = sharedList?.id;
    // On détache l'appareil tout de suite, sans attendre la réponse réseau —
    // "Quitter" doit rester instantané même hors ligne. La mise à jour
    // Firestore (retirer la personne des membres visibles par les autres)
    // se fait en best-effort juste après.
    setActiveSharedListId(null);
    setListId(null);
    setSharedList(null);
    if (currentListId) {
      try {
        await leaveSharedList(currentListId, userId);
      } catch (err) {
        console.error("[CampusPanier] Erreur en quittant la liste partagée:", err);
      }
    }
  }

  async function handleToggle(productId: string, item: SharedListItem) {
    if (!sharedList) return;
    try {
      await toggleSharedListItem(sharedList.id, productId, !item.checked, userName);
    } catch (err) {
      console.error("[CampusPanier] Erreur mise à jour article partagé:", err);
    }
  }

  function handleCopyCode() {
    if (!sharedList) return;
    navigator.clipboard.writeText(sharedList.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (listId === undefined) return null;

  if (!listId || !sharedList) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <Mascot mood="happy" size={44} />
          <div>
            <h1 className="text-2xl font-bold text-campus-ink">
              Liste de coloc
            </h1>
            <p className="text-sm text-campus-muted">
              Partage tes courses et cochez ensemble, en temps réel.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-campus-sand bg-white p-4">
          <p className="text-sm font-bold text-campus-ink">
            Créer une liste à partager
          </p>
          <p className="mt-1 text-xs text-campus-muted">
            Transforme ta liste actuelle ({result.items.length} articles) en
            liste de coloc. Tu recevras un code à partager.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy || result.items.length === 0}
            className="btn-primary mt-3"
          >
            {busy ? "Création..." : "Créer la liste"}
          </button>
        </div>

        <div className="rounded-2xl border border-campus-sand bg-white p-4">
          <p className="text-sm font-bold text-campus-ink">
            Rejoindre avec un code
          </p>
          <p className="mt-1 text-xs text-campus-muted">
            Demande le code à ton/ta colocataire qui a créé la liste.
          </p>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="Ex : F3T8QM"
              maxLength={6}
              className="min-h-[48px] w-full min-w-0 rounded-2xl border-2 border-campus-sand px-3 text-center text-base font-bold uppercase tracking-widest text-campus-ink focus:border-campus-terracotta focus:outline-none"
            />
            <button
              type="button"
              onClick={handleJoin}
              disabled={busy || joinCode.trim().length === 0}
              className="btn-secondary w-auto px-4"
            >
              {busy ? "..." : "Rejoindre"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  const groups = groupSharedItems(sharedList.items, sharedList.itemOrder ?? []);
  const memberList = sharedList.memberIds.map(
    (id) => sharedList.memberNames[id] ?? "Colocataire"
  );
  const checkedCount = Object.values(sharedList.items).filter(
    (item) => item.checked
  ).length;
  const totalCount = Object.keys(sharedList.items).length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-campus-sand bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-campus-muted">
              Code d&apos;invitation
            </p>
            <p className="text-2xl font-extrabold tracking-widest text-campus-terracotta">
              {sharedList.inviteCode}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="shrink-0 rounded-full bg-campus-sand px-3 py-2 text-xs font-bold text-campus-ink"
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>
        <p className="mt-2 text-xs text-campus-muted">
          👥 {memberList.join(", ")}
        </p>
        <p className="mt-1 text-xs text-campus-muted">
          {checkedCount}/{totalCount} articles cochés ·{" "}
          {formatPrice(sharedList.total)} / {formatPrice(sharedList.budget)}
        </p>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <section
            key={group.category}
            className="rounded-2xl border border-campus-sand bg-white p-4"
          >
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-campus-muted">
              {CATEGORY_LABELS[group.category]}
            </h2>
            <ul className="space-y-1">
              {group.entries.map(([productId, item]) => (
                <li key={productId}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-orange-50/60">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggle(productId, item)}
                      className="h-5 w-5 shrink-0 rounded-md border-2 border-campus-sand accent-campus-terracotta"
                    />
                    <span className="flex-1">
                      <span
                        className={`block text-sm font-medium ${
                          item.checked
                            ? "text-campus-muted line-through"
                            : "text-campus-ink"
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.checked && item.checkedBy && (
                        <span className="block text-[11px] text-campus-muted">
                          coché par {item.checkedBy}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        item.checked
                          ? "text-campus-muted line-through"
                          : "text-campus-ink"
                      }`}
                    >
                      {formatPrice(item.price)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <button type="button" onClick={handleLeave} className="btn-secondary">
        Quitter cette liste
      </button>
      <p className="text-center text-xs text-campus-muted">
        Prix indicatifs · Non contractuels
      </p>
    </div>
  );
}
