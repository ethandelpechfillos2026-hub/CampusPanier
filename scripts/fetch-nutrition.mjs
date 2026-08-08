// Ajoute de vraies valeurs nutritionnelles (kcal, protéines/lipides/
// glucides/sel en grammes pour 100 g) à chaque produit déjà présent dans
// data/products.json, depuis Open Food Facts — jamais de valeurs inventées.
// Remplace le "chantier valeurs nutritionnelles réelles" demandé le 8 août
// 2026 : jusqu'ici l'app ne connaissait que des niveaux qualitatifs
// (faible/moyen/riche), pas de grammes précis.
//
// Lancer avec : node scripts/fetch-nutrition.mjs
//
// Important :
// - Ne touche JAMAIS aux champs existants d'un produit (prix, tags régime/
//   allergènes, portions journalières, gourmand/isCondiment...) — ajoute
//   uniquement `nutritionPer100g` (et `offCode` s'il manquait) quand Open
//   Food Facts a une fiche fiable.
// - Un produit déjà traité (qui a déjà `nutritionPer100g`) est ignoré au
//   prochain lancement — le script est donc rejouable sans tout refaire.
// - Deux façons de retrouver un produit sur Open Food Facts :
//   1. Par code-barres (`offCode` déjà connu) → lecture directe, fiable à
//      100 %, pas de risque de mauvaise correspondance.
//   2. Par recherche du nom (`shortName`, plus propre que `name` qui
//      contient souvent un grammage/conditionnement) → mêmes garde-fous que
//      scripts/build-catalog.mjs (tous les mots du terme cherché doivent
//      apparaître dans le nom du résultat, catégories "plat composite"
//      écartées, mots-indices de plat cuisiné écartés) pour éviter les faux
//      positifs déjà rencontrés par le passé (ex: "menthe fraîche" ->
//      bonbons, "gingembre frais" -> jus de fruits).
// - Si rien de fiable n'est trouvé : le produit est simplement ignoré (pas
//   de fallback inventé), il garde ses niveaux qualitatifs existants.
// - Écriture de sauvegarde régulière : interruption sans perte, relance la
//   même commande pour continuer là où ça s'est arrêté.
//
// Limite du bac à sable où j'ai écrit ce script : je n'ai pas accès réseau
// à Open Food Facts depuis mon environnement (proxy bloqué). Ce script doit
// donc être lancé directement sur ton ordinateur, comme
// scripts/build-catalog.mjs.

import { readFile, writeFile } from "node:fs/promises";

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";
const TIMEOUT_MS = 10000;
const DELAY_BETWEEN_REQUESTS_MS = 1200;
const MAX_RETRIES = 2;
const CHECKPOINT_EVERY = 15;
const PRODUCTS_PATH = new URL("../data/products.json", import.meta.url);
const USER_AGENT = "CampusPanier/0.2 (projet etudiant, non commercial)";

const NUTRIMENT_FIELDS = "code,product_name,product_name_fr,nutriments,categories_tags";

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function pickName(p) {
  return p.product_name_fr || p.product_name || "";
}

// Mêmes garde-fous que scripts/build-catalog.mjs — voir ce fichier pour le
// détail des faux positifs déjà rencontrés qui ont mené à ces règles.
const COMPOSITE_DISH_CATEGORY_HINTS = [
  "meals",
  "prepared-meals",
  "pizzas",
  "sandwiches",
  "one-dish-meals",
  "prepared-salads",
  "quiches",
  "ready-to-eat-meals",
];

function looksLikeCompositeDishCategory(p) {
  const tags = (p.categories_tags || []).map((t) => t.toLowerCase());
  return COMPOSITE_DISH_CATEGORY_HINTS.some((hint) =>
    tags.some((t) => t.includes(hint))
  );
}

const DISH_INDICATOR_WORDS = [
  "galette",
  "galettes",
  "pasta",
  "tagliatelles",
  "compotee",
  "rillettes",
  "nems",
  "sparkling",
  "farci",
  "farcie",
  "garni",
  "garnie",
  "tarte",
  "pizza",
  "sandwich",
  "brochette",
  "brochettes",
  "gratin",
  "veloute",
  "quiche",
  "bonbon",
  "bonbons",
];

function hasUnrelatedDishIndicator(name, searchTerm) {
  const normName = normalize(name);
  const normSearch = normalize(searchTerm);
  return DISH_INDICATOR_WORDS.some(
    (word) => normName.includes(word) && !normSearch.includes(word)
  );
}

function hasReliableNutriments(p) {
  const n = p.nutriments || {};
  // On exige au moins kcal + les 3 macros — une fiche incomplète ne sert à
  // rien pour ce script (mieux vaut ignorer que d'à moitié remplir).
  return (
    n["energy-kcal_100g"] !== undefined &&
    n["proteins_100g"] !== undefined &&
    n["fat_100g"] !== undefined &&
    n["carbohydrates_100g"] !== undefined
  );
}

function findBestMatch(products, searchTerm) {
  const keywords = normalize(searchTerm)
    .split(" ")
    .filter((w) => w.length > 2);

  const candidates = products.filter((p) => {
    if (!hasReliableNutriments(p)) return false;
    const name = normalize(pickName(p));
    if (!name) return false;
    if (!keywords.every((k) => name.includes(k))) return false;
    if (looksLikeCompositeDishCategory(p)) return false;
    if (hasUnrelatedDishIndicator(name, searchTerm)) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Le nom le plus court/simple est presque toujours le bon ingrédient brut
  // plutôt qu'une variante composée — même heuristique que build-catalog.mjs.
  candidates.sort((a, b) => pickName(a).length - pickName(b).length);
  return candidates[0];
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, options, label) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options);
      if (res.ok) return res;
      lastError = new Error(`${label} a répondu ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchByBarcode(code) {
  const url = `${OFF_PRODUCT_URL}/${encodeURIComponent(code)}.json?fields=${NUTRIMENT_FIELDS}`;
  const res = await fetchWithRetry(
    url,
    { headers: { "User-Agent": USER_AGENT } },
    "Open Food Facts (code-barres)"
  );
  const data = await res.json();
  if (data.status !== 1 || !data.product || !hasReliableNutriments(data.product)) {
    return null;
  }
  return { code, nutriments: data.product.nutriments };
}

async function searchByName(searchTerm) {
  const url =
    `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(searchTerm)}` +
    `&tagtype_0=countries&tag_contains_0=contains&tag_0=france` +
    `&json=1&page_size=10&fields=${NUTRIMENT_FIELDS}`;

  const res = await fetchWithRetry(
    url,
    { headers: { "User-Agent": USER_AGENT } },
    "Open Food Facts (recherche)"
  );
  const data = await res.json();
  const match = findBestMatch(data.products || [], searchTerm);
  if (!match) return null;
  return { code: match.code, nutriments: match.nutriments };
}

// Arrondis raisonnables : kcal à l'entier, macros au dixième de gramme, sel
// au centième (souvent < 1 g, un dixième perdrait toute précision utile).
function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toNutritionFacts(nutriments) {
  return {
    kcal: round(nutriments["energy-kcal_100g"], 0),
    proteinG: round(nutriments["proteins_100g"], 1),
    lipidesG: round(nutriments["fat_100g"], 1),
    glucidesG: round(nutriments["carbohydrates_100g"], 1),
    selG: round(nutriments["salt_100g"] ?? 0, 2),
  };
}

async function main() {
  const raw = await readFile(PRODUCTS_PATH, "utf-8");
  const products = JSON.parse(raw);

  const todo = products.filter((p) => !p.nutritionPer100g);
  console.log(
    `${products.length} produits au total, ${todo.length} sans valeurs nutritionnelles précises à traiter.\n`
  );

  let updated = 0;
  let skipped = 0;
  let sinceCheckpoint = 0;

  for (const product of products) {
    if (product.nutritionPer100g) continue;

    let result = null;
    try {
      if (product.offCode) {
        result = await fetchByBarcode(product.offCode);
      }
      if (!result) {
        const searchTerm = product.shortName || product.name;
        result = await searchByName(searchTerm);
      }
    } catch (err) {
      console.warn(`  ! Échec réseau pour "${product.id}" (${err.message}) — ignoré.`);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
      continue;
    }

    if (!result) {
      console.warn(`  ! Aucune fiche fiable trouvée pour "${product.id}" — ignoré.`);
      skipped += 1;
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
      continue;
    }

    product.nutritionPer100g = toNutritionFacts(result.nutriments);
    if (!product.offCode && result.code) {
      product.offCode = result.code;
    }
    updated += 1;
    sinceCheckpoint += 1;
    const n = product.nutritionPer100g;
    console.log(
      `  + ${product.id} : ${n.kcal} kcal · P${n.proteinG}g · L${n.lipidesG}g · G${n.glucidesG}g · Sel${n.selG}g`
    );

    if (sinceCheckpoint >= CHECKPOINT_EVERY) {
      await writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 2) + "\n");
      console.log(`  --- sauvegarde intermédiaire (${updated} traités) ---`);
      sinceCheckpoint = 0;
    } else {
      await writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 2) + "\n");
    }

    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
  }

  await writeFile(PRODUCTS_PATH, JSON.stringify(products, null, 2) + "\n");
  console.log(
    `\n${updated} produits mis à jour avec de vraies valeurs nutritionnelles, ${skipped} ignorés (rien de fiable trouvé).`
  );
}

main().catch((err) => {
  console.error("\nErreur fatale, le script s'est arrêté :", err);
  console.error(
    "Pas d'inquiétude : ce qui a déjà été traité est sauvegardé. Relance la même commande pour continuer."
  );
  process.exit(1);
});
