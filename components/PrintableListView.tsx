"use client";

import { formatPrice } from "@/lib/generateShoppingList";
import { ListHistoryEntry } from "@/lib/stats";

interface PrintableListViewProps {
  entry: ListHistoryEntry;
  onClose: () => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Génère un fichier HTML autonome (pas de dépendance PDF) — fonctionne
// partout, y compris depuis une PWA installée en mode autonome, où
// window.print() est souvent silencieusement bloqué par le système.
function buildDownloadableHtml(
  entry: ListHistoryEntry,
  dateLabel: string
): string {
  const itemsHtml =
    entry.items && entry.items.length > 0
      ? entry.items
          .map(
            (item) =>
              `<li style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #E5D3BC;"><span>${escapeHtml(
                item.name
              )}</span><span style="font-weight:600;">${formatPrice(
                item.price
              )}</span></li>`
          )
          .join("")
      : `<p style="color:#6B7280;">Détail non disponible pour cette liste.</p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CampusPanier — Liste du ${dateLabel}</title>
</head>
<body style="font-family:-apple-system,system-ui,sans-serif;background:#FFF8F0;color:#3D405B;max-width:480px;margin:0 auto;padding:32px 24px;">
  <h1 style="font-size:20px;">🛒 CampusPanier</h1>
  <p>Liste de courses du ${dateLabel}</p>
  <ul style="list-style:none;padding:0;margin-top:24px;">${itemsHtml}</ul>
  <div style="display:flex;justify-content:space-between;border-top:2px solid #3D405B;padding-top:12px;margin-top:24px;font-weight:700;font-size:16px;">
    <span>Total</span><span>${formatPrice(entry.total)}</span>
  </div>
  <p style="font-size:12px;color:#6B7280;margin-top:4px;">Budget prévu : ${formatPrice(
    entry.budget
  )}</p>
  <p style="font-size:11px;color:#6B7280;text-align:center;margin-top:24px;">Prix indicatifs · Non contractuels</p>
</body>
</html>`;
}

export default function PrintableListView({
  entry,
  onClose,
}: PrintableListViewProps) {
  const dateLabel = new Date(entry.timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handleDownload() {
    const html = buildDownloadableHtml(entry, dateLabel);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileDate = new Date(entry.timestamp).toISOString().slice(0, 10);
    link.href = url;
    link.download = `campuspanier-liste-${fileDate}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-campus-cream print:static print:h-auto print:overflow-visible print:bg-white">
      <div className="sticky top-0 border-b border-campus-sand bg-campus-cream px-5 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-campus-ink">
            Aperçu avant impression
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full bg-campus-terracotta px-4 py-2 text-xs font-bold text-white"
            >
              ⬇️ Télécharger
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full bg-white px-4 py-2 text-xs font-bold text-campus-ink"
            >
              🖨️ Imprimer
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
        <p className="mt-2 text-[11px] text-campus-muted">
          &quot;Télécharger&quot; fonctionne partout, y compris depuis
          l&apos;app installée. &quot;Imprimer&quot; marche mieux depuis
          Safari ou Chrome directement.
        </p>
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
