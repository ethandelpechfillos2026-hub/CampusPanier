import { NextRequest, NextResponse } from "next/server";
import { Locale } from "@/lib/i18n/locale";
import { Allergen, DietType } from "@/lib/types";

// Route serveur — la clé Groq (process.env.campuspanierrecette, sans préfixe
// NEXT_PUBLIC_) ne quitte jamais le serveur et n'est jamais envoyée au
// navigateur. Génère une recette à partir des ingrédients du panier de
// l'utilisateur, en respectant son régime et ses allergies.
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface GenerateRecipeBody {
  ingredientNames: string[];
  diet: DietType;
  allergies: Allergen[];
  // Noms des recettes déjà proposées dans cette session — pour éviter que
  // "Générer une autre recette" ne redonne la même salade avec un autre nom,
  // ou le même style de plat encore et encore.
  avoidNames?: string[];
  // Langue choisie par l'utilisateur·rice (voir lib/i18n/) — la recette
  // générée (nom, étapes, ingrédients) doit être dans cette langue, pas
  // seulement l'interface autour. "fr" par défaut pour compatibilité avec
  // d'anciens clients qui n'enverraient pas ce champ.
  locale?: Locale;
}

function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en" || value === "es";
}

// Nom de la langue tel qu'on le donne à l'IA dans la consigne "réponds en
// ...", volontairement écrit dans la langue cible elle-même (plus naturel
// pour le modèle que de toujours l'écrire en français).
const LANGUAGE_NAME: Record<Locale, string> = {
  fr: "français",
  en: "English",
  es: "español",
};

const DIET_LABELS: Record<Locale, Record<DietType, string>> = {
  fr: {
    omnivore: "omnivore (pas de restriction)",
    vegetarien: "végétarien (aucune viande ni poisson)",
    vegan: "végan (aucun produit animal, ni viande, ni poisson, ni œuf, ni lait/fromage)",
    "sans-porc": "sans porc",
  },
  en: {
    omnivore: "omnivore (no restriction)",
    vegetarien: "vegetarian (no meat or fish)",
    vegan: "vegan (no animal product: no meat, no fish, no egg, no dairy/cheese)",
    "sans-porc": "no pork",
  },
  es: {
    omnivore: "omnívoro (sin restricciones)",
    vegetarien: "vegetariano (sin carne ni pescado)",
    vegan: "vegano (sin ningún producto animal: sin carne, sin pescado, sin huevo, sin lácteos/queso)",
    "sans-porc": "sin cerdo",
  },
};

const ALLERGEN_LABELS: Record<Locale, Record<Allergen, string>> = {
  fr: {
    gluten: "gluten",
    lactose: "lactose",
    oeuf: "œuf",
    arachide: "arachide",
    "fruits-a-coque": "fruits à coque",
    soja: "soja",
    poisson: "poisson",
    crustaces: "crustacés",
    mollusques: "mollusques",
    celeri: "céleri",
    moutarde: "moutarde",
    sesame: "sésame",
    sulfites: "sulfites",
    lupin: "lupin",
  },
  en: {
    gluten: "gluten",
    lactose: "lactose",
    oeuf: "egg",
    arachide: "peanut",
    "fruits-a-coque": "tree nuts",
    soja: "soy",
    poisson: "fish",
    crustaces: "shellfish",
    mollusques: "molluscs",
    celeri: "celery",
    moutarde: "mustard",
    sesame: "sesame",
    sulfites: "sulfites",
    lupin: "lupin",
  },
  es: {
    gluten: "gluten",
    lactose: "lactosa",
    oeuf: "huevo",
    arachide: "cacahuete",
    "fruits-a-coque": "frutos de cáscara",
    soja: "soja",
    poisson: "pescado",
    crustaces: "crustáceos",
    mollusques: "moluscos",
    celeri: "apio",
    moutarde: "mostaza",
    sesame: "sésamo",
    sulfites: "sulfitos",
    lupin: "altramuz",
  },
};

// Messages d'erreur renvoyés au client, dans la langue demandée — sinon
// une personne en anglais ou en espagnol verrait un message d'erreur en
// français au milieu d'une interface autrement traduite.
const ERROR_MESSAGES: Record<Locale, Record<
  | "notConfigured"
  | "invalidRequest"
  | "noIngredients"
  | "generationFailed"
  | "unexpectedResponse"
  | "invalidFormat"
  | "genericError",
  string
>> = {
  fr: {
    notConfigured: "La génération de recettes par IA n'est pas encore configurée.",
    invalidRequest: "Requête invalide.",
    noIngredients: "Aucun ingrédient disponible pour générer une recette.",
    generationFailed: "La génération a échoué, réessaie dans un instant.",
    unexpectedResponse: "Réponse inattendue de l'IA.",
    invalidFormat: "Format de recette invalide, réessaie.",
    genericError: "Une erreur est survenue, réessaie dans un instant.",
  },
  en: {
    notConfigured: "AI recipe generation isn't configured yet.",
    invalidRequest: "Invalid request.",
    noIngredients: "No ingredients available to generate a recipe.",
    generationFailed: "Generation failed, try again in a moment.",
    unexpectedResponse: "Unexpected response from the AI.",
    invalidFormat: "Invalid recipe format, try again.",
    genericError: "Something went wrong, try again in a moment.",
  },
  es: {
    notConfigured: "La generación de recetas con IA aún no está configurada.",
    invalidRequest: "Solicitud no válida.",
    noIngredients: "No hay ingredientes disponibles para generar una receta.",
    generationFailed: "La generación ha fallado, vuelve a intentarlo en un momento.",
    unexpectedResponse: "Respuesta inesperada de la IA.",
    invalidFormat: "Formato de receta no válido, vuelve a intentarlo.",
    genericError: "Ha ocurrido un error, vuelve a intentarlo en un momento.",
  },
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.campuspanierrecette;
  // Lu avant même le parsing du corps de la requête pour pouvoir localiser
  // le tout premier message d'erreur possible (clé Groq absente) — repli
  // sur "fr" si le corps n'est pas encore accessible à ce stade.
  let locale: Locale = "fr";

  if (!apiKey) {
    return NextResponse.json(
      { error: ERROR_MESSAGES[locale].notConfigured },
      { status: 500 }
    );
  }

  let body: GenerateRecipeBody;
  try {
    body = (await request.json()) as GenerateRecipeBody;
    if (isLocale(body.locale)) locale = body.locale;
  } catch {
    return NextResponse.json({ error: ERROR_MESSAGES[locale].invalidRequest }, { status: 400 });
  }

  const ingredientNames = (body.ingredientNames ?? []).filter(Boolean);
  if (ingredientNames.length === 0) {
    return NextResponse.json(
      { error: ERROR_MESSAGES[locale].noIngredients },
      { status: 400 }
    );
  }

  const dietLabel = DIET_LABELS[locale][body.diet] ?? DIET_LABELS[locale].omnivore;
  const allergenLabels = (body.allergies ?? [])
    .map((allergen) => ALLERGEN_LABELS[locale][allergen])
    .filter(Boolean);

  const avoidNames = (body.avoidNames ?? []).filter(Boolean);
  const languageName = LANGUAGE_NAME[locale];

  const systemPrompt = `Tu es un chef cuisinier qui aide des étudiants à petit budget et peu de temps sur l'application française CampusPanier. Tu génères des recettes en utilisant PRINCIPALEMENT les ingrédients fournis par l'utilisateur. Tu peux ajouter des bases courantes (sel, poivre, eau, huile) si besoin, mais rien d'autre qui ne soit pas déjà dans la liste fournie.

Limites STRICTES, jamais dépassées (une recette qui dépasse une seule de ces limites est invalide, même si elle est par ailleurs bonne) :
- 6 ingrédients principaux maximum (sans compter sel/poivre/eau/huile).
- 5 étapes maximum.
- 25 minutes de préparation maximum.
- Le moins de vaisselle possible : une seule poêle ou casserole si possible. N'utilise le four que si vraiment nécessaire, jamais en plus d'une cuisson à la poêle dans la même recette.

Contraintes obligatoires :
- Régime alimentaire à respecter : ${dietLabel}.
${allergenLabels.length > 0 ? `- Allergènes à exclure absolument : ${allergenLabels.join(", ")}.` : ""}
- La recette doit être réalisable par un·e étudiant·e pressé·e avec un équipement de cuisine basique (plaque de cuisson, poêle, casserole) — ce n'est pas un cours de cuisine.
- Évite la solution de facilité "salade froide" (ingrédients juste coupés et mélangés sans cuisson) sauf si les ingrédients disponibles ne permettent vraiment rien d'autre. Privilégie un vrai plat cuisiné, mais SIMPLE et RAPIDE : poêlée, curry express, wok, soupe rapide, plat one-pot avec féculent, omelette garnie, pâtes sauce express, etc. Évite les techniques qui demandent plusieurs étapes de cuisson séparées ou beaucoup de vaisselle (gratin avec béchamel, velouté mixé, marinade longue...). Varie le style d'un appel à l'autre plutôt que de toujours proposer le même type de plat.
- Si plusieurs ingrédients fournis permettent la même recette, privilégie ceux qui reviennent souvent dans une semaine de courses étudiante (féculents, œufs, légumes de base) plutôt qu'un ingrédient qui ne servira qu'une fois.
- IMPORTANT — Langue de la réponse : rédige absolument tout le texte libre (nom de la recette, ingrédients, étapes) en ${languageName}, y compris si les ingrédients fournis ci-dessous sont écrits dans une autre langue. Ne mélange jamais deux langues dans une même recette. Seul le champ technique "difficulty" reste dans les deux valeurs fixes indiquées ci-dessous, jamais traduit.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, au format exact suivant ("name", "usedIngredients" et "steps" en ${languageName} ; "difficulty" reste littéralement "facile" ou "moyen", jamais traduit) :
{"name": "nom de la recette", "icon": "un seul emoji représentatif", "prepTime": nombre de minutes (≤ 25), "difficulty": "facile" ou "moyen", "usedIngredients": ["ingrédients de la liste fournie réellement utilisés", "6 maximum"], "steps": ["étape 1", "étape 2", "...", "5 maximum"]}`;

  const userPrompt = `Ingrédients disponibles dans mon panier : ${ingredientNames.join(", ")}.

Génère une recette originale à partir de ces ingrédients, avec une vraie cuisson (pas juste assembler des ingrédients froids) sauf si c'est impossible avec cette liste. Rappel : 6 ingrédients principaux maximum, 5 étapes maximum, 25 minutes maximum, le moins de vaisselle possible.${
    avoidNames.length > 0
      ? ` Ne propose PAS un plat similaire à ceux déjà générés dans cette session : ${avoidNames.join(", ")}. Change de style de plat.`
      : ""
  }`;

  // Limites strictes rappelées au serveur (voir systemPrompt) — l'IA suit
  // les consignes la plupart du temps, mais pas toujours. Plutôt que de
  // faire confiance aveuglément ou de tronquer une recette générée (ce qui
  // la rendrait incohérente à mi-étape), on retente UNE fois avec un
  // rappel appuyé si les limites ne sont pas respectées, puis on accepte
  // le résultat tel quel — pour ne pas multiplier les appels (coût, temps
  // d'attente) au-delà du raisonnable.
  const MAX_INGREDIENTS = 6;
  const MAX_STEPS = 5;
  const MAX_PREP_TIME = 25;

  function violatesLimits(recipe: {
    prepTime: number;
    usedIngredients: unknown[];
    steps: unknown[];
  }): boolean {
    return (
      recipe.prepTime > MAX_PREP_TIME ||
      recipe.usedIngredients.length > MAX_INGREDIENTS ||
      recipe.steps.length > MAX_STEPS
    );
  }

  async function callGroq(messages: { role: string; content: string }[]) {
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.9,
          max_tokens: 600,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("[CampusPanier] Erreur Groq:", groqResponse.status, errorText);
      return { error: ERROR_MESSAGES[locale].generationFailed };
    }

    const data = await groqResponse.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { error: ERROR_MESSAGES[locale].unexpectedResponse };
    }

    const recipe = JSON.parse(content);
    if (
      typeof recipe.name !== "string" ||
      typeof recipe.icon !== "string" ||
      typeof recipe.prepTime !== "number" ||
      !Array.isArray(recipe.usedIngredients) ||
      !Array.isArray(recipe.steps)
    ) {
      return { error: ERROR_MESSAGES[locale].invalidFormat };
    }

    return { recipe };
  }

  try {
    const baseMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let result = await callGroq(baseMessages);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    if (violatesLimits(result.recipe)) {
      console.warn(
        "[CampusPanier] Recette IA hors limites, nouvel essai :",
        result.recipe.name,
        `(${result.recipe.usedIngredients.length} ingrédients, ${result.recipe.steps.length} étapes, ${result.recipe.prepTime} min)`
      );
      const retryResult = await callGroq([
        ...baseMessages,
        { role: "assistant", content: JSON.stringify(result.recipe) },
        {
          role: "user",
          content:
            "Cette recette dépasse une des limites strictes (6 ingrédients principaux max, 5 étapes max, 25 minutes max). Régénère une nouvelle recette, plus courte, à partir des mêmes ingrédients, en respectant ces limites cette fois.",
        },
      ]);
      // On garde le second essai seulement s'il a réussi — sinon on
      // préfère renvoyer le premier (imparfait mais utilisable) plutôt
      // qu'une erreur.
      if (!("error" in retryResult)) {
        result = retryResult;
      }
    }

    const { recipe } = result as { recipe: Record<string, unknown> };
    return NextResponse.json({
      name: recipe.name,
      icon: recipe.icon,
      prepTime: recipe.prepTime,
      difficulty: recipe.difficulty === "moyen" ? "moyen" : "facile",
      usedIngredients: recipe.usedIngredients,
      steps: recipe.steps,
    });
  } catch (error) {
    console.error("[CampusPanier] Erreur génération recette IA:", error);
    return NextResponse.json(
      { error: ERROR_MESSAGES[locale].genericError },
      { status: 500 }
    );
  }
}
