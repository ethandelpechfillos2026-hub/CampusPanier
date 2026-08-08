# Plan : élargir le catalogue sans perdre la simplicité

Trois sujets liés dans ta demande, traités séparément ci-dessous : (1) plus d'aliments dans le catalogue, (2) des recettes qui restent ultra simples, (3) empêcher les cas particuliers (cantine, repas dehors, excès) de complexifier le reste de l'appli.

---

## 1. Élargir la gamme d'aliments

### Ce qu'il faut savoir avant de choisir une méthode

Le catalogue actuel (243 produits) n'est **pas** scrapé depuis les sites Lidl/Carrefour/Auchan/U/Leclerc/Intermarché. Il vient de deux bases **ouvertes et légales** :

- **Open Food Facts** (OFF) — base collaborative mondiale de fiches produits (nom, nutrition, allergènes...).
- **Open Prices** — projet collaboratif du même écosystème qui centralise des prix relevés par des utilisateurs en magasin.

Scraper directement Lidl/Carrefour/Auchan/U/Leclerc/Intermarché serait un changement de méthode, pas juste "plus de la même chose", et ça vient avec de vrais inconvénients à connaître :

- **Légal** : ces sites l'interdisent explicitement dans leurs conditions d'utilisation. Tant que CampusPanier est un pilote gratuit c'est un risque limité, mais ça devient un vrai problème le jour où l'appli grossit ou se monétise (Stripe, etc. — déjà dans `ROADMAP.md`).
- **Technique** : structure de site qui change souvent, protections anti-robot (captchas, contenu chargé en JavaScript) → un scraper qu'il faut réparer régulièrement, pas un script qu'on lance une fois et qu'on oublie.
- **Le prix n'est de toute façon "vrai" que pour UN magasin à UN moment donné** — pas idéal pour une appli censée donner un repère fiable partout.

### Plan recommandé, par étapes

**Étape A — à faire maintenant, aucun risque (je peux le lancer directement)**
Relancer et enrichir `scripts/build-catalog.mjs` (déjà construit, déjà utilisé pour les 243 produits actuels) avec beaucoup plus de termes de recherche par catégorie : plus de marques de yaourts/laitages, plats préparés simples, poissons transformés, épices, boissons, snacks salés... Le script n'écrase jamais l'existant, il n'ajoute que du nouveau. Objectif réaliste : passer de ~243 à 400-600 produits sans rien changer d'autre dans l'appli.

**Étape B — à explorer, effort moyen**
Vérifier si un distributeur propose une **API publique documentée** (flux "partenaire" ou affilié) plutôt que du scraping — c'est la façon légitime d'avoir de vrais prix par enseigne. Je peux faire cette recherche si tu veux, mais probable que ça demande une inscription, parfois payante, et aucune garantie qu'une enseigne accepte un usage comme le tien à ce stade.

**Étape C — plus tard, seulement si le pilote marche bien**
Des fournisseurs de données prix existent commercialement (mise à jour régulière, légal, mais payant). À évaluer uniquement une fois qu'il y a un vrai usage/budget — donc après la phase pilote, pas avant. Déjà noté dans `ROADMAP.md` côté monétisation.

**Recommandation : commencer par l'étape A.** C'est gratuit, sans risque, et améliore directement la variété que tu cherches. Dis-moi si tu veux que je le lance.

---

## 2. Garder les recettes ultra simples — FAIT, avec un diagnostic plus précis que prévu

### Diagnostic (après avoir vraiment examiné les 28 recettes + le prompt IA)

Ce qui est déjà bon : aucune des 28 recettes n'avait plus de 6 ingrédients ni plus de 5 étapes — l'app n'a jamais eu de souci de ce côté. En revanche, deux problèmes concrets, différents de "trop compliqué" :

1. **4 recettes dépassaient 25 minutes** (poulet rôti 40 min, cabillaud 30 min, couscous végétarien 30 min, soupe d'hiver 30 min) — corrigées en changeant la technique (dés plus petits, cuisson à la poêle plutôt qu'au four pour le poulet) plutôt qu'en mentant sur le temps affiché.
2. **La sensation "bateau" ne vient pas de la complexité, mais de la répétition du même schéma** : 5 des 28 recettes suivent exactement le même schéma "oignon revenu + féculent/légumineuse + sauce tomate + mijote" (pâtes tomate, curry pois chiches, lentilles mijotées, couscous végétarien, chili haricots rouges). Techniquement simples, mais ça se ressemble trop d'un plat à l'autre. Autre signal du même problème : 29 des 52 ingrédients du carnet de recettes ne servent que dans UNE SEULE recette chacun — beaucoup d'ingrédients "à usage unique" plutôt que réutilisés, ce qui va à l'encontre de la logique "zéro gaspillage" de l'appli.
3. **Côté IA** : le prompt suggérait "gratin" et "sauce mijotée/velouté" comme styles à varier — des techniques qui demandent souvent plus de vaisselle (plat à four + casserole pour la béchamel) et plus de temps que le reste. Rien n'empêchait non plus de dépasser les limites de temps/étapes/ingrédients puisqu'aucune limite n'était écrite noir sur blanc.

### Correctif appliqué

- **4 recettes réécrites** pour tenir sous 25 minutes avec une technique plus rapide (dés plus petits, cuisson simultanée plutôt que séquentielle).
- **Prompt IA** (`app/api/generate-recipe/route.ts`) réécrit avec des limites strictes et explicites : 6 ingrédients principaux maximum, 5 étapes maximum, 25 minutes maximum, le moins de vaisselle possible, "gratin"/"velouté" retirés de la liste de styles suggérés. Consigne ajoutée pour privilégier les ingrédients qui reviennent souvent (féculents, œufs, légumes de base) plutôt qu'un ingrédient à usage unique.
- **Garde-fou serveur** : si une recette générée dépasse une de ces limites, le serveur relance automatiquement UNE fois avec un rappel appuyé avant d'accepter le résultat tel quel (pas de troisième essai, pour ne pas multiplier les appels).

### Ce qui reste un vrai chantier de contenu (pas juste du code) pour plus tard

Le problème du "même schéma qui revient" (point 2 ci-dessus) touche les 28 recettes écrites à la main — le corriger vraiment demanderait d'écrire de nouvelles recettes avec des techniques différentes (pas juste changer des paramètres), et de rééquilibrer quels ingrédients sont utilisés dans plusieurs recettes à la fois. C'est un travail de curation plus long qu'un ajustement de prompt, à prévoir dans une session dédiée si tu veux vraiment casser cette impression de répétition — je ne l'ai pas fait maintenant pour ne pas réécrire du contenu à la hâte et risquer d'introduire des recettes peu réalistes.

---

## 3. Empêcher les cas particuliers de complexifier le reste de l'appli

### Le principe déjà en place (à vérifier que ça tienne dans la durée)

Cantine et "repas mangé dehors" ont été construits pour ne **jamais modifier la liste de courses déjà générée** — ce sont des couches d'information affichées par-dessus, toujours annulables en un clic ("Annuler"). C'est volontaire : la liste de courses reste la seule vérité, rien ne se recalcule tout seul en arrière-plan.

Deux points à renforcer pour que ça reste vrai même si tu ajoutes encore des cas particuliers plus tard :

**a. Regrouper les messages plutôt que les empiler.** Aujourd'hui, cantine et repas-dehors affichent chacun leur propre bandeau. Si on ajoute encore des cas à l'avenir, ça peut vite faire beaucoup de blocs de couleur qui se chevauchent. Je propose de fusionner tout ça en UN seul petit panneau "Repère du jour" qui résume l'essentiel en une ou deux lignes, plutôt que d'empiler les encarts.

**b. Un garde-fou si trop d'exceptions s'accumulent.** Si tu loggues beaucoup de repas dehors dans la même semaine, le calcul "kcal par repas restant" devient de moins en moins fiable (il divise un budget qui rétrécit par de moins en moins de repas). Plutôt que d'afficher un chiffre de plus en plus bizarre, je propose d'afficher un message du type *"Beaucoup de repas dehors cette semaine — le repère calorique devient approximatif, fais au feeling"* dès qu'il reste peu de repas maison à répartir.

**c. Règle à respecter pour toute nouvelle fonctionnalité de suivi (à garder en tête pour la suite).** Toute nouvelle option du même genre devra : ne jamais modifier la liste déjà générée, rester annulable en un geste, et n'ajouter qu'une ligne d'info en plus — jamais un nouvel écran ou un parcours à plusieurs étapes. C'est ce qui garde l'appli "rapide, facile, hyper simple" même si on continue à ajouter des options.

---

## Comment on procède

Dis-moi ce que tu veux que je lance en premier :
- **1A** (élargir le catalogue via Open Food Facts, gratuit et sans risque),
- **2** (limiter les recettes IA à 5-6 étapes / 20-25 min),
- **3a/3b** (fusionner les bandeaux + garde-fou "trop de repas dehors").

Je peux aussi faire les trois à la suite dans une même session si tu préfères ne pas trancher maintenant.
