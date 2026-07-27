// Regénère data/products.json avec de vrais produits (Open Food Facts) et,
// quand c'est possible, de vrais prix relevés (Open Prices) — à la place du
// catalogue inventé à la main.
//
// Lancer avec : node scripts/build-catalog.mjs
//
// Deux protections importantes après le premier essai en conditions
// réelles :
// 1. Open Food Facts renvoie parfois des 503 (surcharge/anti-bot) — le
//    script réessaie automatiquement avant d'abandonner, et surtout ne
//    perd plus jamais un produit : en cas d'échec définitif, il garde
//    l'ancienne donnée (FALLBACKS ci-dessous) plutôt que de le retirer du
//    catalogue.
// 2. Le premier résultat de recherche n'est pas toujours le bon produit
//    (ex: "huile d'olive" -> un gazpacho qui en contient). Le script ne
//    garde un résultat que si le terme cherché apparaît vraiment dans son
//    nom ; sinon il revient aussi au fallback plutôt que d'afficher un
//    produit visiblement faux.
//
// Couverture : Open Food Facts et Open Prices sont des bases communautaires
// (associatives, françaises, gratuites). Les grandes marques/enseignes
// françaises sont bien couvertes ; les prix restent plus inégaux que les
// données produit (nom, nutrition, allergènes).

import { writeFile } from "node:fs/promises";

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const PRICES_URL = "https://prices.openfoodfacts.org/api/v1/prices";
const TIMEOUT_MS = 10000;
const DELAY_BETWEEN_REQUESTS_MS = 1200;
const MAX_RETRIES = 2;

const QUERIES = [
  { id: "pates", search: "pâtes", category: "epicerie", unit: "paquet" },
  { id: "riz", search: "riz basmati", category: "epicerie", unit: "sachet" },
  { id: "lentilles", search: "lentilles vertes", category: "epicerie", unit: "sachet" },
  { id: "pois-chiches", search: "pois chiches", category: "epicerie", unit: "boîte" },
  { id: "sauce-tomate", search: "sauce tomate", category: "epicerie", unit: "boîte" },
  { id: "huile-olive", search: "huile d'olive", category: "epicerie", unit: "bouteille" },
  { id: "cafe", search: "café moulu", category: "epicerie", unit: "paquet" },
  { id: "beurre-cacahuete", search: "beurre de cacahuète", category: "epicerie", unit: "pot" },
  { id: "noix-cajou", search: "noix de cajou", category: "epicerie", unit: "sachet" },
  { id: "carottes", search: "carottes", category: "fruits-legumes", unit: "sachet" },
  { id: "tomates", search: "tomates", category: "fruits-legumes", unit: "barquette" },
  { id: "bananes", search: "bananes", category: "fruits-legumes", unit: "kg" },
  { id: "pommes", search: "pommes", category: "fruits-legumes", unit: "sachet" },
  { id: "pommes-de-terre", search: "pommes de terre", category: "fruits-legumes", unit: "sac" },
  { id: "oignons", search: "oignons", category: "fruits-legumes", unit: "filet" },
  { id: "lait", search: "lait demi-écrémé", category: "frais", unit: "brique" },
  { id: "yaourt-nature", search: "yaourt nature", category: "frais", unit: "pack" },
  { id: "fromage-rape", search: "fromage râpé", category: "frais", unit: "sachet" },
  { id: "oeufs", search: "oeufs", category: "frais", unit: "boîte" },
  { id: "tofu", search: "tofu nature", category: "frais", unit: "barquette" },
  { id: "pain-complet", search: "pain complet", category: "boulangerie", unit: "pain" },
  { id: "baguette", search: "baguette", category: "boulangerie", unit: "pain" },
  { id: "pains-mie", search: "pain de mie", category: "boulangerie", unit: "paquet" },
  { id: "poulet", search: "filet de poulet", category: "viande-poisson", unit: "barquette" },
  { id: "thon", search: "thon", category: "viande-poisson", unit: "boîte" },
  { id: "steak-hache", search: "steak haché", category: "viande-poisson", unit: "barquette" },
  { id: "saucisses", search: "saucisses", category: "viande-poisson", unit: "barquette" },
  { id: "cabillaud", search: "cabillaud", category: "viande-poisson", unit: "barquette" },
];

// Filet de sécurité : si Open Food Facts échoue ou ne renvoie rien de fiable
// pour un produit, on garde ces valeurs (les mêmes que le catalogue
// original) plutôt que de perdre le produit du catalogue.
const FALLBACKS = {
  pates: { name: "Pâtes (500 g)", price: 0.89, kcal: 350, protein: "moyen", lipides: "faible", glucides: "riche", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: ["gluten"] },
  riz: { name: "Riz basmati (1 kg)", price: 1.79, kcal: 350, protein: "faible", lipides: "faible", glucides: "riche", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  lentilles: { name: "Lentilles vertes (500 g)", price: 1.49, kcal: 320, protein: "riche", lipides: "faible", glucides: "moyen", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  "pois-chiches": { name: "Pois chiches (400 g)", price: 0.79, kcal: 160, protein: "riche", lipides: "faible", glucides: "moyen", sel: "moyen", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  "sauce-tomate": { name: "Sauce tomate (400 g)", price: 0.89, kcal: 30, protein: "faible", lipides: "faible", glucides: "faible", sel: "moyen", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  "huile-olive": { name: "Huile d'olive (1 L)", price: 4.99, kcal: 880, protein: "faible", lipides: "riche", glucides: "faible", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  cafe: { name: "Café moulu (250 g)", price: 3.49, kcal: 2, protein: "faible", lipides: "faible", glucides: "faible", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  "beurre-cacahuete": { name: "Beurre de cacahuète (350 g)", price: 2.49, kcal: 590, protein: "moyen", lipides: "riche", glucides: "faible", sel: "moyen", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: ["arachide"] },
  "noix-cajou": { name: "Noix de cajou (150 g)", price: 2.99, kcal: 550, protein: "moyen", lipides: "riche", glucides: "moyen", sel: "moyen", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: ["fruits-a-coque"] },
  carottes: { name: "Carottes (1 kg)", price: 1.29, kcal: 40, protein: "faible", lipides: "faible", glucides: "faible", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  tomates: { name: "Tomates (1 kg)", price: 2.19, kcal: 20, protein: "faible", lipides: "faible", glucides: "faible", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  bananes: { name: "Bananes (1 kg)", price: 1.69, kcal: 90, protein: "faible", lipides: "faible", glucides: "moyen", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  pommes: { name: "Pommes (1 kg)", price: 2.49, kcal: 55, protein: "faible", lipides: "faible", glucides: "moyen", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  "pommes-de-terre": { name: "Pommes de terre (2 kg)", price: 2.49, kcal: 80, protein: "faible", lipides: "faible", glucides: "riche", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  oignons: { name: "Oignons (1 kg)", price: 1.49, kcal: 40, protein: "faible", lipides: "faible", glucides: "faible", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  lait: { name: "Lait demi-écrémé (1 L)", price: 0.99, kcal: 65, protein: "moyen", lipides: "moyen", glucides: "faible", sel: "faible", dietTags: ["omnivore", "vegetarien", "sans-porc"], allergens: ["lactose"] },
  "yaourt-nature": { name: "Yaourts nature (x4)", price: 1.29, kcal: 60, protein: "moyen", lipides: "moyen", glucides: "faible", sel: "faible", dietTags: ["omnivore", "vegetarien", "sans-porc"], allergens: ["lactose"] },
  "fromage-rape": { name: "Fromage râpé (200 g)", price: 2.19, kcal: 380, protein: "riche", lipides: "riche", glucides: "faible", sel: "riche", dietTags: ["omnivore", "vegetarien", "sans-porc"], allergens: ["lactose"] },
  oeufs: { name: "Œufs (x10)", price: 2.29, kcal: 150, protein: "riche", lipides: "moyen", glucides: "faible", sel: "faible", dietTags: ["omnivore", "vegetarien", "sans-porc"], allergens: ["oeuf"] },
  tofu: { name: "Tofu nature (250 g)", price: 1.89, kcal: 120, protein: "riche", lipides: "faible", glucides: "faible", sel: "faible", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: [] },
  "pain-complet": { name: "Pain complet (400 g)", price: 1.29, kcal: 250, protein: "moyen", lipides: "faible", glucides: "riche", sel: "moyen", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: ["gluten"] },
  baguette: { name: "Baguette tradition", price: 0.95, kcal: 270, protein: "faible", lipides: "faible", glucides: "riche", sel: "moyen", dietTags: ["omnivore", "vegetarien", "vegan", "sans-porc"], allergens: ["gluten"] },
  "pains-mie": { name: "Pain de mie (14 tranches)", price: 1.49, kcal: 250, protein: "faible", lipides: "faible", glucides: "riche", sel: "riche", dietTags: ["omnivore", "vegetarien", "sans-porc"], allergens: ["gluten", "oeuf"] },
  poulet: { name: "Filets de poulet (600 g)", price: 5.99, kcal: 165, protein: "riche", lipides: "faible", glucides: "faible", sel: "faible", dietTags: ["omnivore", "sans-porc"], allergens: [] },
  thon: { name: "Thon nature (140 g)", price: 1.49, kcal: 110, protein: "riche", lipides: "faible", glucides: "faible", sel: "moyen", dietTags: ["omnivore", "sans-porc"], allergens: [] },
  "steak-hache": { name: "Steak haché 5 % (500 g)", price: 4.49, kcal: 200, protein: "riche", lipides: "moyen", glucides: "faible", sel: "faible", dietTags: ["omnivore"], allergens: [] },
  saucisses: { name: "Saucisses de Toulouse (x4)", price: 3.29, kcal: 280, protein: "moyen", lipides: "riche", glucides: "faible", sel: "riche", dietTags: ["omnivore"], allergens: [] },
  cabillaud: { name: "Filets de cabillaud (400 g)", price: 4.99, kcal: 90, protein: "riche", lipides: "faible", glucides: "faible", sel: "faible", dietTags: ["omnivore", "sans-porc"], allergens: [] },
};

const FIELDS = [
  "code",
  "product_name",
  "product_name_fr",
  "generic_name_fr",
  "generic_name",
  "abbreviated_product_name_fr",
  "brands",
  "nutriments",
  "allergens_tags",
  "ingredients_analysis_tags",
  "ingredients_text_fr",
].join(",");

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function pickName(p, fallbackSearch) {
  return (
    p.product_name_fr ||
    p.product_name ||
    p.generic_name_fr ||
    p.generic_name ||
    p.abbreviated_product_name_fr ||
    (p.brands ? `${fallbackSearch} (${p.brands.split(",")[0]})` : fallbackSearch)
  );
}

function level(value, low, high) {
  if (value === undefined || value === null) return "moyen";
  if (value <= low) return "faible";
  if (value >= high) return "riche";
  return "moyen";
}

function detectDietTags(p) {
  const tags = p.ingredients_analysis_tags || [];
  const isVegan = tags.includes("en:vegan");
  const isVegetarian = isVegan || tags.includes("en:vegetarian");
  const text = normalize(`${p.ingredients_text_fr || ""} ${p.product_name_fr || ""}`);
  const isPork = /porc|jambon|lardon|bacon|chorizo|saucisson/.test(text);

  const diets = ["omnivore"];
  if (isVegetarian) diets.push("vegetarien");
  if (isVegan) diets.push("vegan");
  if (!isPork) diets.push("sans-porc");
  return diets;
}

function detectAllergens(p) {
  const tags = p.allergens_tags || [];
  const map = {
    "en:gluten": "gluten",
    "en:milk": "lactose",
    "en:eggs": "oeuf",
    "en:peanuts": "arachide",
    "en:nuts": "fruits-a-coque",
  };
  return [...new Set(tags.map((t) => map[t]).filter(Boolean))];
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

// Ne garde un résultat que si le terme cherché apparaît vraiment dans son
// nom — évite les faux positifs (ex: "huile d'olive" -> un gazpacho).
function findBestMatch(products, searchTerm) {
  const keyword = normalize(searchTerm.split(" ")[0]);
  return products.find((p) => {
    if (!p.nutriments || p.nutriments["energy-kcal_100g"] === undefined) return false;
    const name = normalize(pickName(p, ""));
    return name.includes(keyword);
  });
}

async function searchProduct(query) {
  const url =
    `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(query.search)}` +
    `&tagtype_0=countries&tag_contains_0=contains&tag_0=france` +
    `&json=1&page_size=10&fields=${FIELDS}`;

  const res = await fetchWithRetry(
    url,
    { headers: { "User-Agent": "CampusPanier/0.1 (projet etudiant, non commercial)" } },
    "Open Food Facts"
  );
  const data = await res.json();
  return findBestMatch(data.products || [], query.search);
}

// Best-effort : l'API Open Prices a été confirmée fonctionnelle lors du
// premier essai, mais reste une base communautaire — pas de prix pour tout.
async function fetchRealPrice(code) {
  try {
    const url = `${PRICES_URL}?product_code=${encodeURIComponent(code)}&size=20`;
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "CampusPanier/0.1 (projet etudiant, non commercial)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.items || data.results || (Array.isArray(data) ? data : []);
    const prices = items.map((i) => i.price).filter((p) => typeof p === "number" && p > 0);
    if (prices.length === 0) return null;
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return Math.round(avg * 100) / 100;
  } catch {
    return null;
  }
}

function buildFallbackProduct(query) {
  const fb = FALLBACKS[query.id];
  return {
    id: query.id,
    name: fb.name,
    price: fb.price,
    priceSource: "estimation",
    unit: query.unit,
    category: query.category,
    dietTags: fb.dietTags,
    allergens: fb.allergens,
    kcal: fb.kcal,
    protein: fb.protein,
    lipides: fb.lipides,
    glucides: fb.glucides,
    sel: fb.sel,
    easyToCook: true,
  };
}

async function buildProduct(query) {
  console.log(`Recherche : ${query.search}...`);

  let off;
  try {
    off = await searchProduct(query);
  } catch (err) {
    console.warn(`  ! Échec pour "${query.search}" (${err.message}) — repli sur la donnée connue.`);
    return buildFallbackProduct(query);
  }

  if (!off) {
    console.warn(`  ! Aucun produit fiable trouvé pour "${query.search}" — repli sur la donnée connue.`);
    return buildFallbackProduct(query);
  }

  const nutriments = off.nutriments || {};
  const realPrice = off.code ? await fetchRealPrice(off.code) : null;
  const fb = FALLBACKS[query.id];

  return {
    id: query.id,
    name: pickName(off, query.search),
    price: realPrice ?? fb.price,
    priceSource: realPrice ? "open-prices" : "estimation",
    unit: query.unit,
    category: query.category,
    dietTags: detectDietTags(off),
    allergens: detectAllergens(off),
    kcal: Math.round(nutriments["energy-kcal_100g"] ?? fb.kcal),
    protein: level(nutriments["proteins_100g"], 5, 15),
    lipides: level(nutriments["fat_100g"], 3, 17.5),
    glucides: level(nutriments["carbohydrates_100g"], 10, 30),
    sel: level(nutriments["salt_100g"], 0.3, 1.5),
    easyToCook: true,
  };
}

async function main() {
  const results = [];

  for (const query of QUERIES) {
    const product = await buildProduct(query);
    results.push(product);
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
  }

  const realPrices = results.filter((p) => p.priceSource === "open-prices").length;

  console.log(`\n${results.length}/${QUERIES.length} produits dans le catalogue final.`);
  console.log(
    `${realPrices} prix réels (Open Prices), ${results.length - realPrices} prix estimés (repli).`
  );

  await writeFile(
    new URL("../data/products.json", import.meta.url),
    JSON.stringify(results, null, 2) + "\n"
  );
  console.log("\nÉcrit dans data/products.json");
}

main().catch((err) => {
  console.error("\nErreur fatale, le script s'est arrêté :", err);
  process.exit(1);
});
