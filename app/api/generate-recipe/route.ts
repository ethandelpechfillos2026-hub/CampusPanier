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

  const systemPrompt = `Tu es un chef cuisinier qui aide des étudiants à petit budget sur l'application française CampusPanier. Tu génères des recettes simples, rapides et économiques en utilisant PRINCIPALEMENT les ingrédients fournis par l'utilisateur. Tu peux ajouter des bases courantes (sel, poivre, eau, huile) si besoin, mais rien d'autre qui ne soit pas déjà dans la liste fournie.

Contraintes obligatoires :
- Régime alimentaire à respecter : ${dietLabel}.
${allergenLabels.length > 0 ? `- Allergènes à exclure absolument : ${allergenLabels.join(", ")}.` : ""}
- La recette doit être réalisable par un·e étudiant·e avec un équipement de cuisine basique (plaque de cuisson, poêle, casserole, four si besoin).
- Évite la solution de facilité "salade froide" (ingrédients juste coupés et mélangés sans cuisson) sauf si les ingrédients disponibles ne permettent vraiment rien d'autre. Privilégie un vrai plat cuisiné : poêlée, gratin, curry, soupe/velouté, plat one-pot avec féculent, wok, sauce mijotée, omelette garnie, etc. Varie le style d'un appel à l'autre plutôt que de toujours proposer le même type de plat.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, au format exact suivant :
{"name": "nom de la recette", "icon": "un seul emoji représentatif", "prepTime": nombre de minutes, "difficulty": "facile" ou "moyen", "usedIngredients": ["ingrédients de la liste fournie réellement utilisés"], "steps": ["étape 1", "étape 2", "..."]}`;

  const userPrompt = `Ingrédients disponibles dans mon panier : ${ingredientNames.join(", ")}.

Génère une recette originale à partir de ces ingrédients, avec une vraie cuisson (pas juste assembler des ingrédients froids) sauf si c'est impossible avec cette liste.${
    avoidNames.length > 0
      ? ` Ne propose PAS un plat similaire à ceux déjà générés dans cette session : ${avoidNames.join(", ")}. Change de style de plat.`
      : ""
  }`;

  try {
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
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.9,
          max_tokens: 600,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("[CampusPanier] Erreur Groq:", groqResponse.status, errorText);
      return NextResponse.json(
        { error: "La génération a échoué, réessaie dans un instant." },
        { status: 502 }
      );
    }

    const data = await groqResponse.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Réponse inattendue de l'IA." },
        { status: 502 }
      );
    }

    const recipe = JSON.parse(content);
    if (
      typeof recipe.name !== "string" ||
      typeof recipe.icon !== "string" ||
      typeof recipe.prepTime !== "number" ||
      !Array.isArray(recipe.usedIngredients) ||
      !Array.isArray(recipe.steps)
    ) {
      return NextResponse.json(
        { error: "Format de recette invalide, réessaie." },
        { status: 502 }
      );
    }

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
