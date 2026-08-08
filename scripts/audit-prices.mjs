// État des lieux mesurable de la fiabilité des prix du catalogue — à lancer
// après un `npm run build-catalog` pour voir l'effet réel du rafraîchissement
// (aucun accès réseau nécessaire, ce script ne lit que data/products.json).
//
// Lancer avec : node scripts/audit-prices.mjs
//
// Important : la règle de fiabilité ci-dessous (FRESH_PRICE_MAX_AGE_DAYS,
// "un relevé exige enseigne+zone+date ensemble") DOIT rester identique à
// celle de lib/generateShoppingList.ts (getPriceReliability) — dupliquée ici
// volontairement pour que ce script reste un simple outil de lecture, sans
// dépendre de la compilation TypeScript de l'app.

import { readFile } from "node:fs/promises";

const PRODUCTS_PATH = new URL("../data/products.json", import.meta.url);
const FRESH_PRICE_MAX_AGE_DAYS = 90;

function daysSince(isoDate) {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return Infinity;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

// Même règle non négociable que dans l'app : jamais "relevé" sans les trois
// à la fois (enseigne + ville + date). Sinon -> estimation.
function getReliability(priceInfo) {
  if (!priceInfo || priceInfo.source !== "open-prices") return "estimation";
  if (!priceInfo.enseigne || !priceInfo.zone || !priceInfo.date) return "estimation";
  return daysSince(priceInfo.date) > FRESH_PRICE_MAX_AGE_DAYS ? "old" : "fresh";
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

async function main() {
  const products = JSON.parse(await readFile(PRODUCTS_PATH, "utf8"));

  const counts = { fresh: 0, old: 0, estimation: 0 };
  const ageDays = [];
  const byCategory = new Map();

  for (const product of products) {
    const reliability = getReliability(product.priceInfo);
    counts[reliability] += 1;

    if (reliability === "fresh" || reliability === "old") {
      ageDays.push(daysSince(product.priceInfo.date));
    }

    if (!byCategory.has(product.category)) {
      byCategory.set(product.category, { total: 0, documented: 0 });
    }
    const cat = byCategory.get(product.category);
    cat.total += 1;
    if (reliability === "fresh" || reliability === "old") cat.documented += 1;
  }

  const documented = counts.fresh + counts.old;
  const medianAge = median(ageDays);

  console.log("=== État des lieux des prix — data/products.json ===\n");
  console.log(`Total produits : ${products.length}`);
  console.log(
    `Relevés France récents (≤ ${FRESH_PRICE_MAX_AGE_DAYS}j, enseigne+ville+date) : ${counts.fresh}`
  );
  console.log(`Relevés France anciens (enseigne+ville+date, > ${FRESH_PRICE_MAX_AGE_DAYS}j) : ${counts.old}`);
  console.log(`→ Total avec enseigne + ville + date : ${documented} (${Math.round((documented / products.length) * 100)}%)`);
  console.log(`Estimations (dont relevés historiques sans détail conservé) : ${counts.estimation} (${Math.round((counts.estimation / products.length) * 100)}%)`);
  console.log(
    medianAge !== null
      ? `Ancienneté médiane des relevés documentés : ${medianAge} jours`
      : "Ancienneté médiane des relevés documentés : n/a (aucun relevé documenté pour l'instant)"
  );

  console.log("\n--- Couverture par catégorie (part de produits documentés) ---");
  const categoryRows = [...byCategory.entries()]
    .map(([category, { total, documented }]) => ({
      category,
      total,
      documented,
      pct: Math.round((documented / total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);

  for (const row of categoryRows) {
    console.log(`  ${row.category} : ${row.documented}/${row.total} documentés (${row.pct}%)`);
  }

  if (categoryRows.length > 0) {
    console.log(
      `\nCatégorie la moins bien couverte : ${categoryRows[0].category} (${categoryRows[0].pct}%)`
    );
  }
}

main();
