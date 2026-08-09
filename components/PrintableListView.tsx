"use client";

import { formatPrice, products } from "@/lib/generateShoppingList";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { INTL_LOCALE, Locale } from "@/lib/i18n/locale";
import { ListHistoryEntry, ListHistoryItem } from "@/lib/stats";
import { CATEGORY_LABEL_KEYS, CATEGORY_ORDER, ProductCategory } from "@/lib/types";

interface PrintableListViewProps {
  entry: ListHistoryEntry;
  onClose: () => void;
}

interface ItemGroup {
  // `null` = rayon inconnu ("Autres") — le libellé traduit se résout au
  // moment de l'affichage via `labelFor`, pas ici : cette fonction ne
  // dépend pas du contexte React (voir buildDownloadableHtml plus bas, qui
  // s'exécute hors composant).
  category: ProductCategory | null;
  items: ListHistoryItem[];
}

// Range les articles par rayon (Épicerie, Fruits et légumes...), exactement
// comme l'onglet "Ma liste" — sans ça, la liste imprimée/téléchargée sort
// dans l'ordre brut de l'algorithme de sélection, pas par rayon, ce qui
// donne un résultat illisible en magasin.
function groupItemsByCategory(items: ListHistoryItem[]): ItemGroup[] {
  const byCategory = new Map<string, ListHistoryItem[]>();
  const others: ListHistoryItem[] = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    if (!product) {
      others.push(item);
      continue;
    }
    const list = byCategory.get(product.category) ?? [];
    list.push(item);
    byCategory.set(product.category, list);
  }

  const groups: ItemGroup[] = CATEGORY_ORDER.filter((category) =>
    byCategory.has(category)
  ).map((category) => ({
    category,
    items: byCategory.get(category)!,
  }));

  if (others.length > 0) {
    groups.push({ category: null, items: others });
  }

  return groups;
}

// `t` est passé en paramètre plutôt qu'appelé via useTranslation() : cette
// fonction sert aussi bien au rendu React (ci-dessous) qu'à
// buildDownloadableHtml (hors contexte React) — voir handleDownload.
function labelFor(group: ItemGroup, t: (key: string) => string): string {
  return group.category ? t(CATEGORY_LABEL_KEYS[group.category]) : t("printableListView.other");
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
  dateLabel: string,
  locale: Locale,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const groups = entry.items ? groupItemsByCategory(entry.items) : [];

  const groupsHtml =
    groups.length > 0
      ? groups
          .map((group) => {
            const rows = group.items
              .map((item) => {
                const quantity = item.quantity ?? 1;
                const label =
                  quantity > 1 ? `${item.name} ×${quantity}` : item.name;
                return `<li style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed #E5D3BC;"><span>${escapeHtml(
                  label
                )}</span><span style="font-weight:600;">${formatPrice(
                  item.price * quantity
                )}</span></li>`;
              })
              .join("");
            return `<section style="margin-top:20px;">
              <h2 style="font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6B7280;margin:0 0 6px;">${escapeHtml(
                labelFor(group, t)
              )}</h2>
              <ul style="list-style:none;padding:0;margin:0;">${rows}</ul>
            </section>`;
          })
          .join("")
      : `<p style="color:#6B7280;">${escapeHtml(t("printableListView.noDetailForDownload"))}</p>`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(t("printableListView.downloadTitle", { date: dateLabel }))}</title>
</head>
<body style="font-family:-apple-system,system-ui,sans-serif;background:#FFF8F0;color:#3D405B;max-width:480px;margin:0 auto;padding:32px 24px;">
  <h1 style="font-size:20px;margin:0;">🛒 CampusPanier</h1>
  <p style="margin:4px 0 0;">${escapeHtml(t("printableListView.shoppingListOf", { date: dateLabel }))}</p>
  ${groupsHtml}
  <div style="display:flex;justify-content:space-between;border-top:2px solid #3D405B;padding-top:12px;margin-top:24px;font-weight:700;font-size:16px;">
    <span>${escapeHtml(t("printableListView.total"))}</span><span>${formatPrice(entry.total)}</span>
  </div>
  <p style="font-size:12px;color:#6B7280;margin-top:4px;">${escapeHtml(
    t("printableListView.plannedBudget", { amount: formatPrice(entry.budget) })
  )}</p>
  <p style="font-size:11px;color:#6B7280;text-align:center;margin-top:24px;">${escapeHtml(t("resultsContent.priceDisclaimer"))}</p>
</body>
</html>`;
}

export default function PrintableListView({
  entry,
  onClose,
}: PrintableListViewProps) {
  const { t, language } = useTranslation();
  const dateLabel = new Date(entry.timestamp).toLocaleDateString(INTL_LOCALE[language], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const groups = entry.items ? groupItemsByCategory(entry.items) : [];

  function handleDownload() {
    const html = buildDownloadableHtml(entry, dateLabel, language, t);
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
            {t("printableListView.previewTitle")}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full bg-campus-terracotta px-4 py-2 text-xs font-bold text-white"
            >
              {t("printableListView.download")}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full bg-campus-surface px-4 py-2 text-xs font-bold text-campus-ink"
            >
              {t("printableListView.print")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-campus-sand px-4 py-2 text-xs font-bold text-campus-ink"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-campus-muted">
          {t("printableListView.downloadHint")}
        </p>
      </div>

      <div className="print-area mx-auto max-w-[480px] px-6 py-8">
        <h1 className="text-xl font-bold text-campus-ink">🛒 CampusPanier</h1>
        <p className="mt-1 text-sm text-campus-muted">
          {t("printableListView.shoppingListOf", { date: dateLabel })}
        </p>

        {groups.length > 0 ? (
          <>
            <div className="mt-6 space-y-5">
              {groups.map((group) => (
                <section key={group.category ?? "other"}>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-campus-muted">
                    {labelFor(group, t)}
                  </h2>
                  <ul className="space-y-1.5">
                    {group.items.map((item, index) => {
                      const quantity = item.quantity ?? 1;
                      return (
                        <li
                          key={`${item.id}-${index}`}
                          className="flex items-center justify-between border-b border-dashed border-campus-sand pb-1.5 text-sm text-campus-ink"
                        >
                          <span>
                            {item.name}
                            {quantity > 1 && (
                              <span className="ml-1.5 text-xs font-bold text-campus-terracotta">
                                ×{quantity}
                              </span>
                            )}
                          </span>
                          <span className="font-semibold">
                            {formatPrice(item.price * quantity)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t-2 border-campus-ink pt-3 text-base font-bold text-campus-ink">
              <span>{t("printableListView.total")}</span>
              <span>{formatPrice(entry.total)}</span>
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-campus-muted">
            {t("printableListView.noDetailsAvailable")}
          </p>
        )}

        <p className="mt-1 text-xs text-campus-muted">
          {t("printableListView.plannedBudget", { amount: formatPrice(entry.budget) })}
        </p>
        <p className="mt-4 text-center text-xs text-campus-muted">
          {t("resultsContent.priceDisclaimer")}
        </p>
      </div>
    </div>
  );
}
