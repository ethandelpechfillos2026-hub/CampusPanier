import { NextRequest, NextResponse } from "next/server";
import { Allergen, DietType } from "@/lib/types";

// Route serveur — la clé Groq (process.env.GROQ_API_KEY, sans préfixe
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
}

const DIET_LABELS: Record<DietType, string> = {
  omnivore: "omnivore (pas de restriction)",
  vegetarien: "végétarien (aucune viande ni poisson)",
  vegan: "végan (aucun produit animal, ni viande, ni poisson, ni œuf, ni lait/fromage)",
  "sans-porc": "sans porc",
};

const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: "gluten",
  lactose: "lactose",
  "fruits-a-coque": "fruits à coque",
  oeuf: "œuf",
  arachide: "arachide",
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.campuspanierrecette;
  if (!apiKey) {
    return NextResponse.json(
      { error: "La génération de recettes par IA n'est pas encore configurée." },
      { status: 500 }
    );
  }

  let body: GenerateRecipeBody;
  try {
    body = (await request.json()) as GenerateRecipeBody;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const ingredientNames = (body.ingredientNames ?? []).filter(Boolean);
  if (ingredientNames.length === 0) {
    return NextResponse.json(
      { error: "Aucun ingrédient disponible pour générer une recette." },
      { status: 400 }
    );
  }

  const dietLabel = DIET_LABELS[body.diet] ?? DIET_LABELS.omnivore;
  const allergenLabels = (body.allergies ?? [])
    .map((allergen) => ALLERGEN_LABELS[allergen])
    .filter(Boolean);

  const avoidNames = (body.avoidNames ?? []).filter(Boolean);

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

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, au format exact suivant :
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
      return { error: "La génération a échoué, réessaie dans un instant." as const };
    }

    const data = await groqResponse.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { error: "Réponse inattendue de l'IA." as const };
    }

    const recipe = JSON.parse(content);
    if (
      typeof recipe.name !== "string" ||
      typeof recipe.icon !== "string" ||
      typeof recipe.prepTime !== "number" ||
      !Array.isArray(recipe.usedIngredients) ||
      !Array.isArray(recipe.steps)
    ) {
      return { error: "Format de recette invalide, réessaie." as const };
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
      { error: "Une erreur est survenue, réessaie dans un instant." },
      { status: 500 }
    );
  }
}
