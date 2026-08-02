"use client";

import { formatPrice } from "@/lib/generateShoppingList";
import { ListHistoryEntry } from "@/lib/stats";

interface PrintableListViewProps {
  entry: ListHistoryEntry;
  onClose: () => void;
}

// Vue "impression" d'une liste passée — pas de librairie PDF, juste une mise
// en page propre + la fonction d'impression native du navigateur (l'export
// PDF fait partie de toutes les boîtes de dialogue d'impression). Zéro
// dépendance à installer, ça marche même hors-ligne dans la PWA.
export default function PrintableListView({
  entry,
  onClose,
}: PrintableListViewProps) {
  const dateLabel = new Date(entry.timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-campus-cream print:static print:h-auto print:overflow-visible print:bg-white">
      <div className="sticky top-0 flex items-center justify-between border-b border-campus-sand bg-campus-cream px-5 py-4 print:hidden">
        <p className="text-sm font-bold text-campus-ink">
          Aperçu avant impression
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-campus-terracotta px-4 py-2 text-xs font-bold text-white"
          >
            🖨️ Imprimer / PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-campus-sand px-4 py-2 text-xs font-bold text-campus-ink"
          >
            Fermer
          </button>
        </div>
      </div>

      <div className="print-area mx-auto max-w-[480px] px-6 py-8">
        <h1 className="text-xl font-bold text-campus-ink">🛒 CampusPanier</h1>
        <p className="mt-1 text-sm text-campus-muted">
          Liste de courses du {dateLabel}
        </p>

        {entry.items && entry.items.length > 0 ? (
          <>
            <ul className="mt-6 space-y-2">
              {entry.items.map((item, index) => (
                <li
                  key={`${item.id}-${index}`}
                  className="flex items-center justify-between border-b border-dashed border-campus-sand pb-2 text-sm text-campus-ink"
                >
                  <span>{item.name}</span>
                  <span className="font-semibold">
                    {formatPrice(item.price)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between border-t-2 border-campus-ink pt-3 text-base font-bold text-campus-ink">
              <span>Total</span>
              <span>{formatPrice(entry.total)}</span>
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-campus-muted">
            Le détail des articles n&apos;est pas disponible pour cette liste
            (générée avant la mise à jour de l&apos;historique).
          </p>
        )}

        <p className="mt-1 text-xs text-campus-muted">
          Budget prévu : {formatPrice(entry.budget)}
        </p>
        <p className="mt-4 text-center text-xs text-campus-muted">
          Prix indicatifs · Non contractuels
        </p>
      </div>
    </div>
  );
}
