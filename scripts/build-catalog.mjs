// Agrandit data/products.json avec de vrais produits (Open Food Facts) et,
// quand c'est possible, de vrais prix relevés (Open Prices) — jamais de
// données inventées par une IA (cf. décision prise avec Ethan : trop risqué
// pour les prix et les allergènes).
//
// Lancer avec : node scripts/build-catalog.mjs
//
// Important : ce script n'AJOUTE que des produits nouveaux. Il ne touche
// jamais aux produits déjà présents dans data/products.json (leurs prix,
// tags "gourmand"/"isCondiment", portions journalières... restent
// intouchés) — un id déjà présent est simplement ignoré.
//
// Comme le catalogue actuel a été construit/complété à la main après le
// premier passage de ce script, les nouveaux produits n'ont volontairement
// PAS de weeklyServings/servingUnit/gramsPerServing (pas de donnée fiable
// pour les portions journalières sans curation manuelle) : ils apparaissent
// normalement dans "Ma liste" et respectent bien le budget/régime/allergies,
// mais ne sont pas encore placés dans le planning jour par jour ("Mon
// menu"). Ethan peut compléter ces champs à la main plus tard pour les
// produits qu'il juge utiles d'y voir apparaître.
//
// Protections :
// 1. Open Food Facts renvoie parfois des 503 (surcharge/anti-bot) — le
//    script réessaie automatiquement avant d'abandonner.
// 2. Le premier résultat de recherche n'est pas toujours le bon produit
//    (ex: "huile d'olive" -> un gazpacho qui en contient) — un résultat
//    n'est gardé que si le terme cherché apparaît vraiment dans son nom.
// 3. Si Open Food Facts ne trouve rien de fiable, le produit est purement
//    ignoré (pas de fallback inventé) — puisque c'est un ajout, pas une
//    donnée existante à protéger.
// 4. Si Open Prices n'a pas de relevé français, on utilise une estimation
//    générique par rayon (clairement marquée priceInfo.source: "estimation"),
//    jamais un prix inventé au produit près. Quand un relevé existe, on
//    garde le PLUS RÉCENT situé en France (avec son enseigne/sa ville/sa
//    date dans priceInfo) plutôt qu'une moyenne de relevés potentiellement
//    d'autres pays ou de plusieurs années — voir fetchRealPrice().
// 5. Écriture de sauvegarde tous les 15 produits ajoutés — si le script est
//    interrompu (réseau coupé, fermeture du terminal...), rien n'est perdu
//    et on peut simplement relancer la même commande : les produits déjà
//    ajoutés sont automatiquement ignorés au prochain passage.

import { readFile, writeFile } from "node:fs/promises";

const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const PRICES_URL = "https://prices.openfoodfacts.org/api/v1/prices";
const TIMEOUT_MS = 10000;
const DELAY_BETWEEN_REQUESTS_MS = 1200;
const MAX_RETRIES = 2;
const CHECKPOINT_EVERY = 15;
const PRODUCTS_PATH = new URL("../data/products.json", import.meta.url);

// Estimation générique par rayon, utilisée seulement quand Open Prices n'a
// aucun relevé pour le produit — approximation grossière assumée (prix
// moyens de supermarché français), jamais présentée comme un vrai relevé.
const CATEGORY_PRICE_DEFAULTS = {
  epicerie: 2.5,
  "fruits-legumes": 2.2,
  frais: 2.8,
  boulangerie: 1.8,
  "viande-poisson": 5.5,
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
  const isPork = /porc|jambon|lardon|bacon|chorizo|saucisson|andouillette|boudin/.test(text);

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
  // On exige que TOUS les mots significatifs du terme cherché apparaissent
  // dans le nom du produit — pas seulement le premier. Se limiter au
  // premier mot (ex: "menthe" pour "menthe fraîche") laissait passer des
  // faux positifs bien réels : "menthe fraîche" a matché des bonbons Tic
  // Tac parfum menthe, "gingembre frais" un jus de fruits, etc. — retrouvés
  // et corrigés à la main après coup, d'où ce durcissement pour la suite.
  const keywords = normalize(searchTerm)
    .split(" ")
    .filter((w) => w.length > 2);

  return products.find((p) => {
    if (!p.nutriments || p.nutriments["energy-kcal_100g"] === undefined) return false;
    const name = normalize(pickName(p, ""));
    return keywords.every((k) => name.includes(k));
  });
}

async function searchProduct(query) {
  const url =
    `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(query.search)}` +
    `&tagtype_0=countries&tag_contains_0=contains&tag_0=france` +
    `&json=1&page_size=10&fields=${FIELDS}`;

  const res = await fetchWithRetry(
    url,
    { headers: { "User-Agent": "CampusPanier/0.2 (projet etudiant, non commercial)" } },
    "Open Food Facts"
  );
  const data = await res.json();
  return findBestMatch(data.products || [], query.search);
}

// Best-effort : base communautaire, pas de prix pour tout.
//
// Renvoie le relevé Open Prices le PLUS RÉCENT situé en France (et lui
// seul), avec son enseigne/sa ville/sa date — plutôt qu'une moyenne aveugle
// de tous les relevés retournés (ancienne méthode : mélangeait des relevés
// d'autres pays et de plusieurs années sans qu'on puisse le voir). Un seul
// relevé attribuable et honnête vaut mieux qu'une moyenne qu'on ne peut
// justifier auprès de personne.
async function fetchRealPrice(code) {
  try {
    const url = `${PRICES_URL}?product_code=${encodeURIComponent(code)}&size=20`;
    const res = await fetchWithTimeout(url, {
      headers: { "User-Agent": "CampusPanier/0.2 (projet etudiant, non commercial)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.items || data.results || (Array.isArray(data) ? data : []);

    const frenchItems = items.filter(
      (i) =>
        typeof i.price === "number" &&
        i.price > 0 &&
        i.location?.osm_address_country_code === "FR"
    );
    if (frenchItems.length === 0) return null;

    frenchItems.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const mostRecent = frenchItems[0];

    return {
      price: Math.round(mostRecent.price * 100) / 100,
      date: mostRecent.date,
      enseigne: mostRecent.location?.osm_brand || undefined,
      zone: mostRecent.location?.osm_address_city || undefined,
    };
  } catch {
    return null;
  }
}

// Retourne null (produit ignoré) si Open Food Facts n'a rien de fiable —
// jamais de nutrition/allergènes inventés pour un produit qu'on ne connaît
// pas vraiment.
async function buildProduct(query) {
  console.log(`Recherche : ${query.search}...`);

  let off;
  try {
    off = await searchProduct(query);
  } catch (err) {
    console.warn(`  ! Échec réseau pour "${query.search}" (${err.message}) — ignoré.`);
    return null;
  }

  if (!off) {
    console.warn(`  ! Aucun produit fiable trouvé pour "${query.search}" — ignoré.`);
    return null;
  }

  const nutriments = off.nutriments || {};
  const realPrice = off.code ? await fetchRealPrice(off.code) : null;
  const price = realPrice?.price ?? CATEGORY_PRICE_DEFAULTS[query.category];
  const priceInfo = realPrice
    ? {
        source: "open-prices",
        date: realPrice.date,
        enseigne: realPrice.enseigne,
        zone: realPrice.zone,
      }
    : { source: "estimation" };

  const product = {
    id: query.id,
    shortName: query.shortName,
    name: pickName(off, query.search),
    price,
    priceInfo,
    offCode: off.code,
    unit: query.unit,
    category: query.category,
    mealSlot: query.mealSlot,
    dietTags: detectDietTags(off),
    allergens: detectAllergens(off),
    kcal: Math.round(nutriments["energy-kcal_100g"] ?? 100),
    protein: level(nutriments["proteins_100g"], 5, 15),
    lipides: level(nutriments["fat_100g"], 3, 17.5),
    glucides: level(nutriments["carbohydrates_100g"], 10, 30),
    sel: level(nutriments["salt_100g"], 0.3, 1.5),
    easyToCook: true,
  };

  if (query.gourmand) product.gourmand = true;
  if (query.isCondiment) product.isCondiment = true;

  return product;
}

// ---------------------------------------------------------------------
// Nouveaux produits à ajouter. Chaque entrée : id (unique, jamais présent
// dans le catalogue actuel), search (terme utilisé pour chercher sur Open
// Food Facts), shortName (libellé court pour l'affichage), category, unit,
// mealSlot, et optionnellement gourmand/isCondiment.
// ---------------------------------------------------------------------

const NEW_QUERIES = [
  // --- Épicerie ---
  { id: "pates-completes", search: "pâtes complètes", shortName: "Pâtes complètes", category: "epicerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "spaghetti", search: "spaghetti", shortName: "Spaghetti", category: "epicerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "nouilles-chinoises", search: "nouilles chinoises", shortName: "Nouilles chinoises", category: "epicerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "riz-complet", search: "riz complet", shortName: "Riz complet", category: "epicerie", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "boulgour", search: "boulgour", shortName: "Boulgour", category: "epicerie", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "polenta", search: "polenta", shortName: "Polenta", category: "epicerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "farine-complete", search: "farine complète", shortName: "Farine complète", category: "epicerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "farine-sans-gluten", search: "farine sans gluten", shortName: "Farine sans gluten", category: "epicerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "levure-chimique", search: "levure chimique", shortName: "Levure chimique", category: "epicerie", unit: "sachet", mealSlot: "encas-extra", isCondiment: true },
  { id: "levure-boulanger", search: "levure boulangère", shortName: "Levure boulangère", category: "epicerie", unit: "sachet", mealSlot: "encas-extra", isCondiment: true },
  { id: "chapelure", search: "chapelure", shortName: "Chapelure", category: "epicerie", unit: "paquet", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "haricots-verts-conserve", search: "haricots verts conserve", shortName: "Haricots verts (conserve)", category: "epicerie", unit: "boîte", mealSlot: "dejeuner-diner" },
  { id: "petits-pois-conserve", search: "petits pois conserve", shortName: "Petits pois (conserve)", category: "epicerie", unit: "boîte", mealSlot: "dejeuner-diner" },
  { id: "champignons-conserve", search: "champignons émincés", shortName: "Champignons (conserve)", category: "epicerie", unit: "boîte", mealSlot: "dejeuner-diner" },
  { id: "olives", search: "olives", shortName: "Olives", category: "epicerie", unit: "pot", mealSlot: "encas-extra" },
  { id: "cornichons", search: "cornichons", shortName: "Cornichons", category: "epicerie", unit: "pot", mealSlot: "encas-extra", isCondiment: true },
  { id: "artichauts-marines", search: "coeurs d'artichauts", shortName: "Cœurs d'artichauts", category: "epicerie", unit: "boîte", mealSlot: "dejeuner-diner" },
  { id: "harissa", search: "harissa", shortName: "Harissa", category: "epicerie", unit: "pot", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "curry-poudre", search: "curry en poudre", shortName: "Curry en poudre", category: "epicerie", unit: "pot", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "cumin", search: "cumin", shortName: "Cumin", category: "epicerie", unit: "pot", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "paprika", search: "paprika", shortName: "Paprika", category: "epicerie", unit: "pot", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "poivre", search: "poivre moulu", shortName: "Poivre", category: "epicerie", unit: "moulin", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "sel", search: "sel fin", shortName: "Sel", category: "epicerie", unit: "paquet", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "herbes-de-provence", search: "herbes de provence", shortName: "Herbes de Provence", category: "epicerie", unit: "pot", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "ketchup", search: "ketchup", shortName: "Ketchup", category: "epicerie", unit: "flacon", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "pesto", search: "pesto", shortName: "Pesto", category: "epicerie", unit: "pot", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "vinaigre-balsamique", search: "vinaigre balsamique", shortName: "Vinaigre balsamique", category: "epicerie", unit: "bouteille", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "bouillon-cube", search: "bouillon cube", shortName: "Bouillon cube", category: "epicerie", unit: "boîte", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "tabasco", search: "tabasco", shortName: "Tabasco", category: "epicerie", unit: "flacon", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "nuoc-mam", search: "nuoc mam", shortName: "Nuoc-mâm", category: "epicerie", unit: "bouteille", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "lait-coco", search: "lait de coco", shortName: "Lait de coco", category: "epicerie", unit: "boîte", mealSlot: "dejeuner-diner" },
  { id: "cereales-chocolatees", search: "céréales chocolatées", shortName: "Céréales chocolatées", category: "epicerie", unit: "paquet", mealSlot: "petit-dejeuner", gourmand: true },
  { id: "muesli-fruits", search: "muesli fruits", shortName: "Muesli aux fruits", category: "epicerie", unit: "paquet", mealSlot: "petit-dejeuner" },
  { id: "sirop-erable", search: "sirop d'érable", shortName: "Sirop d'érable", category: "epicerie", unit: "bouteille", mealSlot: "petit-dejeuner", gourmand: true },
  { id: "the-vert", search: "thé vert", shortName: "Thé vert", category: "epicerie", unit: "boîte", mealSlot: "petit-dejeuner" },
  { id: "chocolat-poudre", search: "chocolat en poudre", shortName: "Chocolat en poudre", category: "epicerie", unit: "boîte", mealSlot: "petit-dejeuner", gourmand: true },
  { id: "jus-pomme", search: "jus de pomme", shortName: "Jus de pomme", category: "epicerie", unit: "brique", mealSlot: "petit-dejeuner" },
  { id: "jus-multifruits", search: "jus multifruits", shortName: "Jus multifruits", category: "epicerie", unit: "brique", mealSlot: "petit-dejeuner" },
  { id: "eau-gazeuse", search: "eau gazeuse", shortName: "Eau gazeuse", category: "epicerie", unit: "bouteille", mealSlot: "encas-extra" },
  { id: "soda-cola", search: "soda cola", shortName: "Soda cola", category: "epicerie", unit: "bouteille", mealSlot: "encas-extra", gourmand: true },
  { id: "sirop-menthe", search: "sirop de menthe", shortName: "Sirop de menthe", category: "epicerie", unit: "bouteille", mealSlot: "encas-extra", gourmand: true },
  { id: "chips", search: "chips nature", shortName: "Chips", category: "epicerie", unit: "paquet", mealSlot: "encas-extra", gourmand: true },
  { id: "biscuits-sables", search: "biscuits sablés", shortName: "Biscuits sablés", category: "epicerie", unit: "paquet", mealSlot: "encas-extra", gourmand: true },
  { id: "barres-cereales", search: "barres de céréales", shortName: "Barres de céréales", category: "epicerie", unit: "boîte", mealSlot: "encas-extra" },
  { id: "chocolat-noir", search: "chocolat noir", shortName: "Chocolat noir", category: "epicerie", unit: "tablette", mealSlot: "encas-extra", gourmand: true },
  { id: "bonbons", search: "bonbons", shortName: "Bonbons", category: "epicerie", unit: "paquet", mealSlot: "encas-extra", gourmand: true },
  { id: "popcorn", search: "pop-corn", shortName: "Pop-corn", category: "epicerie", unit: "sachet", mealSlot: "encas-extra", gourmand: true },
  { id: "gateaux-secs", search: "gâteaux secs", shortName: "Gâteaux secs", category: "epicerie", unit: "paquet", mealSlot: "encas-extra", gourmand: true },
  { id: "houmous", search: "houmous", shortName: "Houmous", category: "epicerie", unit: "pot", mealSlot: "dejeuner-diner" },
  { id: "tahini", search: "tahini", shortName: "Tahini", category: "epicerie", unit: "pot", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "graines-chia", search: "graines de chia", shortName: "Graines de chia", category: "epicerie", unit: "sachet", mealSlot: "petit-dejeuner" },
  { id: "graines-lin", search: "graines de lin", shortName: "Graines de lin", category: "epicerie", unit: "sachet", mealSlot: "petit-dejeuner" },
  { id: "noix", search: "cerneaux de noix", shortName: "Noix", category: "epicerie", unit: "sachet", mealSlot: "encas-extra" },
  { id: "amandes", search: "amandes", shortName: "Amandes", category: "epicerie", unit: "sachet", mealSlot: "encas-extra" },
  { id: "pistaches", search: "pistaches", shortName: "Pistaches", category: "epicerie", unit: "sachet", mealSlot: "encas-extra" },
  { id: "raisins-secs", search: "raisins secs", shortName: "Raisins secs", category: "epicerie", unit: "sachet", mealSlot: "encas-extra" },
  { id: "dattes", search: "dattes", shortName: "Dattes", category: "epicerie", unit: "sachet", mealSlot: "encas-extra" },
  { id: "pates-sans-gluten", search: "pâtes sans gluten", shortName: "Pâtes sans gluten", category: "epicerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "lait-avoine", search: "lait d'avoine", shortName: "Lait d'avoine", category: "epicerie", unit: "brique", mealSlot: "petit-dejeuner" },
  { id: "lait-amande", search: "lait d'amande", shortName: "Lait d'amande", category: "epicerie", unit: "brique", mealSlot: "petit-dejeuner" },
  { id: "boisson-riz", search: "boisson au riz", shortName: "Boisson au riz", category: "epicerie", unit: "brique", mealSlot: "petit-dejeuner" },
  { id: "sauce-carbonara", search: "sauce carbonara", shortName: "Sauce carbonara", category: "epicerie", unit: "pot", mealSlot: "dejeuner-diner" },
  { id: "sucre-vanille", search: "sucre vanillé", shortName: "Sucre vanillé", category: "epicerie", unit: "sachet", mealSlot: "petit-dejeuner", isCondiment: true },
  { id: "gelatine", search: "gélatine", shortName: "Gélatine", category: "epicerie", unit: "sachet", mealSlot: "encas-extra", isCondiment: true },
  { id: "cafe-decafeine", search: "café décaféiné", shortName: "Café décaféiné", category: "epicerie", unit: "paquet", mealSlot: "petit-dejeuner" },

  // --- Fruits et légumes ---
  { id: "kiwi", search: "kiwi", shortName: "Kiwis", category: "fruits-legumes", unit: "filet", mealSlot: "encas-extra" },
  { id: "ananas", search: "ananas", shortName: "Ananas", category: "fruits-legumes", unit: "pièce", mealSlot: "encas-extra" },
  { id: "mangue", search: "mangue", shortName: "Mangue", category: "fruits-legumes", unit: "pièce", mealSlot: "encas-extra" },
  { id: "pasteque", search: "pastèque", shortName: "Pastèque", category: "fruits-legumes", unit: "pièce", mealSlot: "encas-extra" },
  { id: "melon", search: "melon", shortName: "Melon", category: "fruits-legumes", unit: "pièce", mealSlot: "encas-extra" },
  { id: "fraises", search: "fraises", shortName: "Fraises", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "framboises", search: "framboises", shortName: "Framboises", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "myrtilles", search: "myrtilles", shortName: "Myrtilles", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "raisin", search: "raisin", shortName: "Raisin", category: "fruits-legumes", unit: "grappe", mealSlot: "encas-extra" },
  { id: "poire", search: "poires", shortName: "Poires", category: "fruits-legumes", unit: "sachet", mealSlot: "encas-extra" },
  { id: "pamplemousse", search: "pamplemousse", shortName: "Pamplemousse", category: "fruits-legumes", unit: "pièce", mealSlot: "encas-extra" },
  { id: "clementine", search: "clémentines", shortName: "Clémentines", category: "fruits-legumes", unit: "filet", mealSlot: "encas-extra" },
  { id: "abricot", search: "abricots", shortName: "Abricots", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "peche", search: "pêches", shortName: "Pêches", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "prune", search: "prunes", shortName: "Prunes", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "cerises", search: "cerises", shortName: "Cerises", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "figues", search: "figues", shortName: "Figues", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "grenade", search: "grenade", shortName: "Grenade", category: "fruits-legumes", unit: "pièce", mealSlot: "encas-extra" },
  { id: "papaye", search: "papaye", shortName: "Papaye", category: "fruits-legumes", unit: "pièce", mealSlot: "encas-extra" },
  { id: "aubergine", search: "aubergine", shortName: "Aubergine", category: "fruits-legumes", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "celeri", search: "céleri branche", shortName: "Céleri", category: "fruits-legumes", unit: "botte", mealSlot: "dejeuner-diner" },
  { id: "betterave", search: "betterave cuite", shortName: "Betterave", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "radis", search: "radis", shortName: "Radis", category: "fruits-legumes", unit: "botte", mealSlot: "encas-extra" },
  { id: "navet", search: "navets", shortName: "Navets", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "panais", search: "panais", shortName: "Panais", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "patate-douce", search: "patate douce", shortName: "Patate douce", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "courge-butternut", search: "courge butternut", shortName: "Butternut", category: "fruits-legumes", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "potiron", search: "potiron", shortName: "Potiron", category: "fruits-legumes", unit: "part", mealSlot: "dejeuner-diner" },
  { id: "endive", search: "endives", shortName: "Endives", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "fenouil", search: "fenouil", shortName: "Fenouil", category: "fruits-legumes", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "asperges", search: "asperges", shortName: "Asperges", category: "fruits-legumes", unit: "botte", mealSlot: "dejeuner-diner" },
  { id: "artichaut", search: "artichaut", shortName: "Artichaut", category: "fruits-legumes", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "petits-pois-frais", search: "petits pois frais", shortName: "Petits pois frais", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "haricots-verts-frais", search: "haricots verts frais", shortName: "Haricots verts frais", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "roquette", search: "roquette", shortName: "Roquette", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "mache", search: "mâche", shortName: "Mâche", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "chou-rouge", search: "chou rouge", shortName: "Chou rouge", category: "fruits-legumes", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "chou-vert", search: "chou vert", shortName: "Chou vert", category: "fruits-legumes", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "choux-bruxelles", search: "choux de Bruxelles", shortName: "Choux de Bruxelles", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "blette", search: "blettes", shortName: "Blettes", category: "fruits-legumes", unit: "botte", mealSlot: "dejeuner-diner" },
  { id: "persil", search: "persil frais", shortName: "Persil", category: "fruits-legumes", unit: "botte", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "basilic", search: "basilic frais", shortName: "Basilic", category: "fruits-legumes", unit: "pot", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "coriandre", search: "coriandre fraîche", shortName: "Coriandre", category: "fruits-legumes", unit: "botte", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "ciboulette", search: "ciboulette", shortName: "Ciboulette", category: "fruits-legumes", unit: "pot", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "menthe-fraiche", search: "menthe fraîche", shortName: "Menthe fraîche", category: "fruits-legumes", unit: "botte", mealSlot: "encas-extra", isCondiment: true },
  { id: "gingembre-frais", search: "gingembre frais", shortName: "Gingembre frais", category: "fruits-legumes", unit: "racine", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "echalote", search: "échalote", shortName: "Échalote", category: "fruits-legumes", unit: "filet", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "piment", search: "piment frais", shortName: "Piment frais", category: "fruits-legumes", unit: "sachet", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "citron-vert", search: "citron vert", shortName: "Citron vert", category: "fruits-legumes", unit: "filet", mealSlot: "dejeuner-diner" },
  { id: "mure", search: "mûres", shortName: "Mûres", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "groseille", search: "groseilles", shortName: "Groseilles", category: "fruits-legumes", unit: "barquette", mealSlot: "encas-extra" },
  { id: "courge-spaghetti", search: "courge spaghetti", shortName: "Courge spaghetti", category: "fruits-legumes", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "mais-epi", search: "maïs en épi", shortName: "Maïs en épi", category: "fruits-legumes", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "salade-frisee", search: "salade frisée", shortName: "Salade frisée", category: "fruits-legumes", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "cresson", search: "cresson", shortName: "Cresson", category: "fruits-legumes", unit: "botte", mealSlot: "dejeuner-diner" },

  // --- Frais ---
  { id: "camembert", search: "camembert", shortName: "Camembert", category: "frais", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "brie", search: "brie", shortName: "Brie", category: "frais", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "comte", search: "comté", shortName: "Comté", category: "frais", unit: "part", mealSlot: "dejeuner-diner" },
  { id: "emmental", search: "emmental", shortName: "Emmental", category: "frais", unit: "part", mealSlot: "dejeuner-diner" },
  { id: "chevre", search: "fromage de chèvre", shortName: "Fromage de chèvre", category: "frais", unit: "bûche", mealSlot: "dejeuner-diner" },
  { id: "roquefort", search: "roquefort", shortName: "Roquefort", category: "frais", unit: "part", mealSlot: "dejeuner-diner" },
  { id: "feta", search: "feta", shortName: "Feta", category: "frais", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "ricotta", search: "ricotta", shortName: "Ricotta", category: "frais", unit: "pot", mealSlot: "dejeuner-diner" },
  { id: "parmesan", search: "parmesan râpé", shortName: "Parmesan", category: "frais", unit: "sachet", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "cottage-cheese", search: "cottage cheese", shortName: "Cottage cheese", category: "frais", unit: "pot", mealSlot: "petit-dejeuner" },
  { id: "faisselle", search: "faisselle", shortName: "Faisselle", category: "frais", unit: "pot", mealSlot: "petit-dejeuner" },
  { id: "creme-dessert", search: "crème dessert", shortName: "Crème dessert", category: "frais", unit: "pack", mealSlot: "encas-extra", gourmand: true },
  { id: "petit-suisse", search: "petits suisses", shortName: "Petits suisses", category: "frais", unit: "pack", mealSlot: "petit-dejeuner" },
  { id: "lait-entier", search: "lait entier", shortName: "Lait entier", category: "frais", unit: "brique", mealSlot: "petit-dejeuner" },
  { id: "lait-ecreme", search: "lait écrémé", shortName: "Lait écrémé", category: "frais", unit: "brique", mealSlot: "petit-dejeuner" },
  { id: "beurre-demi-sel", search: "beurre demi-sel", shortName: "Beurre demi-sel", category: "frais", unit: "plaquette", mealSlot: "petit-dejeuner", isCondiment: true },
  { id: "margarine", search: "margarine", shortName: "Margarine", category: "frais", unit: "pot", mealSlot: "petit-dejeuner", isCondiment: true },
  { id: "skyr", search: "skyr", shortName: "Skyr", category: "frais", unit: "pot", mealSlot: "petit-dejeuner" },
  { id: "yaourt-soja", search: "yaourt au soja", shortName: "Yaourt au soja", category: "frais", unit: "pack", mealSlot: "petit-dejeuner" },
  { id: "creme-soja", search: "crème de soja", shortName: "Crème de soja", category: "frais", unit: "brique", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "fromage-vegetal", search: "fromage végétal", shortName: "Fromage végétal", category: "frais", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "tofu-fume", search: "tofu fumé", shortName: "Tofu fumé", category: "frais", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "seitan", search: "seitan", shortName: "Seitan", category: "frais", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "tempeh", search: "tempeh", shortName: "Tempeh", category: "frais", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "jambon-blanc", search: "jambon blanc", shortName: "Jambon blanc", category: "frais", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "pate-campagne", search: "pâté de campagne", shortName: "Pâté de campagne", category: "frais", unit: "pot", mealSlot: "dejeuner-diner" },
  { id: "rillettes", search: "rillettes", shortName: "Rillettes", category: "frais", unit: "pot", mealSlot: "dejeuner-diner" },
  { id: "saucisson-sec", search: "saucisson sec", shortName: "Saucisson sec", category: "frais", unit: "pièce", mealSlot: "encas-extra" },
  { id: "terrine", search: "terrine de campagne", shortName: "Terrine", category: "frais", unit: "pot", mealSlot: "dejeuner-diner" },
  { id: "pate-feuilletee", search: "pâte feuilletée", shortName: "Pâte feuilletée", category: "frais", unit: "rouleau", mealSlot: "dejeuner-diner" },
  { id: "pate-brisee", search: "pâte brisée", shortName: "Pâte brisée", category: "frais", unit: "rouleau", mealSlot: "dejeuner-diner" },
  { id: "quiche-prete", search: "quiche lorraine", shortName: "Quiche lorraine", category: "frais", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "ravioli-frais", search: "ravioli frais", shortName: "Ravioli frais", category: "frais", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "pizza-fraiche", search: "pizza fraîche", shortName: "Pizza fraîche", category: "frais", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "beurre-allege", search: "beurre allégé", shortName: "Beurre allégé", category: "frais", unit: "plaquette", mealSlot: "petit-dejeuner", isCondiment: true },
  { id: "creme-fouettee", search: "crème fouettée", shortName: "Crème fouettée", category: "frais", unit: "bombe", mealSlot: "encas-extra", gourmand: true },
  { id: "glace-vanille", search: "glace vanille", shortName: "Glace vanille", category: "frais", unit: "pot", mealSlot: "encas-extra", gourmand: true },
  { id: "mousse-chocolat", search: "mousse au chocolat", shortName: "Mousse au chocolat", category: "frais", unit: "pack", mealSlot: "encas-extra", gourmand: true },
  { id: "tiramisu", search: "tiramisu", shortName: "Tiramisu", category: "frais", unit: "part", mealSlot: "encas-extra", gourmand: true },
  { id: "flan", search: "flan pâtissier", shortName: "Flan pâtissier", category: "frais", unit: "part", mealSlot: "encas-extra", gourmand: true },

  // --- Viande et poisson ---
  { id: "escalope-veau", search: "escalope de veau", shortName: "Escalope de veau", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "cotes-porc", search: "côtes de porc", shortName: "Côtes de porc", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "roti-boeuf", search: "rôti de boeuf", shortName: "Rôti de bœuf", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "roti-porc", search: "rôti de porc", shortName: "Rôti de porc", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "poulet-entier", search: "poulet entier", shortName: "Poulet entier", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "cuisses-poulet", search: "cuisses de poulet", shortName: "Cuisses de poulet", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "blanc-dinde", search: "blanc de dinde", shortName: "Blanc de dinde", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "boeuf-hache-15", search: "boeuf haché 15%", shortName: "Bœuf haché 15%", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "agneau-hache", search: "agneau haché", shortName: "Agneau haché", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "foie-volaille", search: "foie de volaille", shortName: "Foie de volaille", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "lapin", search: "lapin", shortName: "Lapin", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "magret-canard", search: "magret de canard", shortName: "Magret de canard", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "dorade", search: "dorade", shortName: "Dorade", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "maquereau", search: "maquereau", shortName: "Maquereau", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "truite", search: "truite", shortName: "Truite", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "colin", search: "colin", shortName: "Colin", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "sole", search: "sole", shortName: "Sole", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "moules", search: "moules", shortName: "Moules", category: "viande-poisson", unit: "filet", mealSlot: "dejeuner-diner" },
  { id: "calamars", search: "calamars", shortName: "Calamars", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "saint-jacques", search: "noix de Saint-Jacques", shortName: "Noix de Saint-Jacques", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "poisson-pane", search: "poisson pané", shortName: "Poisson pané", category: "viande-poisson", unit: "boîte", mealSlot: "dejeuner-diner" },
  { id: "thon-frais", search: "thon frais", shortName: "Thon frais", category: "viande-poisson", unit: "pavé", mealSlot: "dejeuner-diner" },
  { id: "sardines-fraiches", search: "sardines fraîches", shortName: "Sardines fraîches", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "hareng", search: "hareng fumé", shortName: "Hareng fumé", category: "viande-poisson", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "anchois", search: "anchois", shortName: "Anchois", category: "viande-poisson", unit: "boîte", mealSlot: "dejeuner-diner", isCondiment: true },
  { id: "jambon-cru", search: "jambon cru", shortName: "Jambon cru", category: "viande-poisson", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "pate-de-foie", search: "pâté de foie", shortName: "Pâté de foie", category: "viande-poisson", unit: "pot", mealSlot: "dejeuner-diner" },
  { id: "boudin-noir", search: "boudin noir", shortName: "Boudin noir", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "andouillette", search: "andouillette", shortName: "Andouillette", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "bacon", search: "bacon", shortName: "Bacon", category: "viande-poisson", unit: "paquet", mealSlot: "petit-dejeuner" },
  { id: "nuggets-poulet", search: "nuggets de poulet", shortName: "Nuggets de poulet", category: "viande-poisson", unit: "boîte", mealSlot: "dejeuner-diner" },
  { id: "cordon-bleu", search: "cordon bleu", shortName: "Cordon bleu", category: "viande-poisson", unit: "boîte", mealSlot: "dejeuner-diner" },
  { id: "brochettes-poulet", search: "brochettes de poulet", shortName: "Brochettes de poulet", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "filet-dinde-fume", search: "filet de dinde fumé", shortName: "Filet de dinde fumé", category: "viande-poisson", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "surimi", search: "surimi", shortName: "Surimi", category: "viande-poisson", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "truite-fumee", search: "truite fumée", shortName: "Truite fumée", category: "viande-poisson", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "gambas", search: "gambas", shortName: "Gambas", category: "viande-poisson", unit: "sachet", mealSlot: "dejeuner-diner" },
  { id: "poulpe", search: "poulpe", shortName: "Poulpe", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },
  { id: "lieu-noir", search: "lieu noir", shortName: "Lieu noir", category: "viande-poisson", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "veau-hache", search: "veau haché", shortName: "Veau haché", category: "viande-poisson", unit: "barquette", mealSlot: "dejeuner-diner" },

  // --- Boulangerie ---
  { id: "pain-de-campagne", search: "pain de campagne", shortName: "Pain de campagne", category: "boulangerie", unit: "pain", mealSlot: "dejeuner-diner" },
  { id: "pain-seigle", search: "pain de seigle", shortName: "Pain de seigle", category: "boulangerie", unit: "pain", mealSlot: "dejeuner-diner" },
  { id: "pain-nordique", search: "pain nordique", shortName: "Pain nordique", category: "boulangerie", unit: "paquet", mealSlot: "petit-dejeuner" },
  { id: "pain-burger", search: "pain burger", shortName: "Pain burger", category: "boulangerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "pain-hot-dog", search: "pain hot-dog", shortName: "Pain hot-dog", category: "boulangerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "pain-pita", search: "pain pita", shortName: "Pain pita", category: "boulangerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "naan", search: "naan", shortName: "Naan", category: "boulangerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "pain-epices", search: "pain d'épices", shortName: "Pain d'épices", category: "boulangerie", unit: "pain", mealSlot: "petit-dejeuner", gourmand: true },
  { id: "chausson-pomme", search: "chausson aux pommes", shortName: "Chausson aux pommes", category: "boulangerie", unit: "pièce", mealSlot: "petit-dejeuner", gourmand: true },
  { id: "pain-au-chocolat", search: "pain au chocolat", shortName: "Pain au chocolat", category: "boulangerie", unit: "pièce", mealSlot: "petit-dejeuner", gourmand: true },
  { id: "pain-aux-raisins", search: "pain aux raisins", shortName: "Pain aux raisins", category: "boulangerie", unit: "pièce", mealSlot: "petit-dejeuner", gourmand: true },
  { id: "financier", search: "financier", shortName: "Financier", category: "boulangerie", unit: "pièce", mealSlot: "encas-extra", gourmand: true },
  { id: "madeleine", search: "madeleines", shortName: "Madeleines", category: "boulangerie", unit: "paquet", mealSlot: "encas-extra", gourmand: true },
  { id: "cookie", search: "cookie", shortName: "Cookie", category: "boulangerie", unit: "pièce", mealSlot: "encas-extra", gourmand: true },
  { id: "muffin", search: "muffin", shortName: "Muffin", category: "boulangerie", unit: "pièce", mealSlot: "encas-extra", gourmand: true },
  { id: "tarte-fine", search: "tarte fine", shortName: "Tarte fine", category: "boulangerie", unit: "pièce", mealSlot: "encas-extra", gourmand: true },
  { id: "galette-bretonne", search: "galette bretonne", shortName: "Galette bretonne", category: "boulangerie", unit: "paquet", mealSlot: "encas-extra", gourmand: true },
  { id: "gressins", search: "gressins", shortName: "Gressins", category: "boulangerie", unit: "paquet", mealSlot: "encas-extra" },
  { id: "tortilla-mais", search: "tortillas de maïs", shortName: "Tortillas de maïs", category: "boulangerie", unit: "paquet", mealSlot: "dejeuner-diner" },
  { id: "pain-complet-graines", search: "pain complet aux graines", shortName: "Pain complet aux graines", category: "boulangerie", unit: "pain", mealSlot: "petit-dejeuner" },
  { id: "baguette-graines", search: "baguette aux céréales", shortName: "Baguette aux céréales", category: "boulangerie", unit: "pain", mealSlot: "petit-dejeuner" },
  { id: "focaccia", search: "focaccia", shortName: "Focaccia", category: "boulangerie", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "pain-brie", search: "pain brié", shortName: "Pain brié", category: "boulangerie", unit: "pain", mealSlot: "petit-dejeuner" },
  { id: "fougasse", search: "fougasse", shortName: "Fougasse", category: "boulangerie", unit: "pièce", mealSlot: "dejeuner-diner" },
  { id: "blinis", search: "blinis", shortName: "Blinis", category: "boulangerie", unit: "paquet", mealSlot: "dejeuner-diner" },
];

async function main() {
  console.log(`${NEW_QUERIES.length} produits candidats à ajouter.\n`);

  let added = 0;
  let skipped = 0;
  let sinceCheckpoint = 0;

  for (const query of NEW_QUERIES) {
    const raw = await readFile(PRODUCTS_PATH, "utf-8");
    const current = JSON.parse(raw);
    const existingIds = new Set(current.map((p) => p.id));

    if (existingIds.has(query.id)) {
      console.log(`= "${query.id}" existe déjà — ignoré.`);
      continue;
    }

    const product = await buildProduct(query);
    if (!product) {
      skipped += 1;
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
      continue;
    }

    current.push(product);
    added += 1;
    sinceCheckpoint += 1;
    const logDetail =
      product.priceInfo.source === "open-prices"
        ? [product.priceInfo.enseigne, product.priceInfo.zone, product.priceInfo.date]
            .filter(Boolean)
            .join(", ") || "open-prices (détail indisponible)"
        : "estimation";
    console.log(`  + ${product.name} (${product.price} € · ${logDetail})`);

    if (sinceCheckpoint >= CHECKPOINT_EVERY) {
      await writeFile(PRODUCTS_PATH, JSON.stringify(current, null, 2) + "\n");
      console.log(`  --- sauvegarde intermédiaire (${current.length} produits au total) ---`);
      sinceCheckpoint = 0;
    } else {
      // Écriture à chaque produit quand même : le coût est négligeable
      // (petit fichier JSON local) et ça garantit qu'on ne perd jamais plus
      // d'un produit en cas d'interruption brutale.
      await writeFile(PRODUCTS_PATH, JSON.stringify(current, null, 2) + "\n");
    }

    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
  }

  const finalRaw = await readFile(PRODUCTS_PATH, "utf-8");
  const final = JSON.parse(finalRaw);

  console.log(`\n${added} produits ajoutés, ${skipped} ignorés (non trouvés sur Open Food Facts).`);
  console.log(`Catalogue final : ${final.length} produits.`);
}

main().catch((err) => {
  console.error("\nErreur fatale, le script s'est arrêté :", err);
  console.error("Pas d'inquiétude : ce qui a déjà été ajouté est sauvegardé. Relance la même commande pour continuer.");
  process.exit(1);
});
