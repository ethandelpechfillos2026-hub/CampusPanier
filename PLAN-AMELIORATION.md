# Plan d'amélioration CampusPanier (hors légal/CGU/Stripe)

Comme demandé : tout ce qui est mentions légales, CGU/CGV et Stripe reste dans `ROADMAP.md` pour une phase séparée, plus tard. Ce document se concentre uniquement sur l'app elle-même — la tester, la solidifier, l'améliorer. Suis les phases dans l'ordre, chacune a des étapes précises.

---

## Phase 0 — QA code déjà faite (8 août 2026)

Avant de te redonner une checklist, j'ai relu à fond chaque moteur de l'app (liste de courses, menu, calories, recettes, coloc, badges/favoris) ligne par ligne, pas juste testé au hasard. 7 vrais bugs trouvés et corrigés, vérifiés avec `tsc`/`eslint`/vérifications de données à chaque fois :

1. Un pain ("Miche surprise") était mal étiqueté dans le catalogue — exclu à tort des régimes végétarien et sans porc alors que ce n'est ni de la viande ni du porc.
2. Deux listes de féculents maintenues séparément (liste de courses / menu jour par jour) avaient divergé avec le temps, dont une référence à un produit retiré du catalogue — fusionnées en une seule source pour ne plus jamais désynchroniser.
3. Impossible de logger "j'ai mangé dehors" quand ton budget ne prévoyait déjà rien à un repas — maintenant possible, sauf pour un déjeuner cantine (déjà hors maison par définition).
4. "Mes recettes" pouvait proposer une recette avec ZÉRO ingrédient déjà prévu ce jour-là — contredisait la promesse de l'onglet. Filtré, avec un message différent selon la vraie raison (rien ne correspond à ton régime, vs rien ne correspond à aujourd'hui précisément).
5. "Quitter cette liste" (coloc) ne faisait que débrancher ton téléphone — tu restais listé·e comme membre aux yeux des autres indéfiniment. Corrige maintenant vraiment ton départ.
6. L'étoile "favori" pouvait confondre deux profils pourtant différents (cantine, enseigne préférée, mode performance, profil corporel) parce que ces critères n'étaient pas comparés — corrigé.
7. Un commentaire de code périmé référençait encore l'ancien nom de variable pour la clé Groq — nettoyé.

Rien de tout ça n'était visible facilement en testant à l'œil sur ton téléphone (ce sont des cas précis : ce pain particulier, ce jour de budget serré, ce profil favori précis) — d'où l'intérêt de ce passage en plus de tes tests. Le catalogue de recettes (28 recettes) reste correct et sans doublon/référence cassée, mais objectivement plus mince que la concurrence (Jow, KOSTO) — à traiter dans une session dédiée "contenu", pas en vitesse ici.

---

## Phase 0bis — Repas trop répétitifs (8 août 2026, corrigé)

Retour direct : le déjeuner était souvent identique au dîner (mêmes produits, juste des quantités différentes), et ça se répétait à l'identique de jour en jour. Confirmé par simulation avant correction — 0 variation sur une semaine type. Deux changements :

1. Le moteur de menu répartit maintenant chaque féculent/légume/fromage/viande sur des CRÉNEAUX précis (ce jour ET ce repas), plus sur des jours entiers coupés artificiellement en deux. Déjeuner et dîner peuvent donc vraiment différer, et qui est au déjeuner vs au dîner change d'un jour à l'autre.
2. Le nombre de produits différents autorisés par catégorie a été relevé (ex : viande-poisson 3→4, légumes 4→5) — plus de budget veut dire plus de vraie variété, pas juste plus de quantité du même produit.

Revérifié par simulation après correction : 0 jour sur 7 avec déjeuner identique au dîner, sur un budget confortable (60€) comme sur un budget serré (25€). Les petits budgets restent forcément plus répétitifs que les gros (moins de produits achetables), mais varient quand même sur la semaine.

---

## Phase 1 — QA manuelle (à faire toi-même, ~30-45 min)

Ce qui suit, seul un vrai téléphone peut le révéler (rendu visuel, ressenti, connexion réseau réelle). Coche au fur et à mesure :

1. Profil végane + allergie gluten + petit budget (15€) → liste cohérente ou message "budget insuffisant" propre (avec les liens Cop1/Linkee/Agoraé, vérifiés à jour).
2. Profil omnivore + gros budget (80€) + Mode Performance + "prise de masse" → calories/macros affichées cohérentes, aliments bruts.
3. Profil sans porc + "Gourmand" coché → un vrai repas à chaque créneau, pas que du plaisir sucré/gras. Vérifie que le pain "Miche surprise" peut maintenant apparaître.
4. Active "Cantine le midi" → déjeuner vide en semaine avec le message cantine, week-end normal, total de la liste plus bas qu'sans l'option.
   Nouveau : avec un budget confortable (50€+), vérifie sur plusieurs jours que le déjeuner et le dîner ne sont plus systématiquement identiques.
5. Nouveau : à l'étape 1 du profil, essaie de cliquer "Suivant" SANS cocher la case de consentement santé → doit bloquer avec un message. Coche-la → passe normalement.
6. Ajuste tes macros à la main (étape 3 du profil) → le nombre de calories affiché change bien en bougeant les curseurs.
7. Va dans "Mes recettes", change de jour → les recettes proposées changent selon ce qui est réellement prévu ce jour-là. Teste un jour avec un budget très serré où rien ne colle → nouveau message distinct affiché.
8. Génère 3-4 recettes IA d'affilée → elles varient et respectent régime/allergies.
9. Nouveau : dans "Mon menu", sur un jour où un repas est vide (budget serré, pas cantine) → le bouton "J'ai mangé dehors" doit maintenant être proposé même sans repas prévu.
10. Enregistre une liste en favori, change juste l'enseigne préférée ou la cantine, régénère → l'étoile ne doit PAS afficher "déjà favori" (avant ce correctif, elle le faisait à tort).
11. Historique → ouvre une liste passée, teste impression/export PDF, vérifie que les quantités ×2/×3 s'affichent bien si présentes.
12. Installe l'app sur l'écran d'accueil (iPhone et/ou Android) → l'icône s'affiche bien.
13. Coche tous les articles d'une liste jusqu'au bout → badge "Liste parfaite".
14. Si possible, teste la liste coloc à deux téléphones → ordre et coches restent synchronisés, et vérifie que "Quitter cette liste" fait bien disparaître la personne de la liste des membres vue par l'autre téléphone.
15. Nouveau : va dans "Réglages" (lien en haut à droite une fois connecté·e) → vérifie les 4 liens légaux et le parcours de suppression de compte (sans le confirmer si tu veux garder ton compte de test !).

**Note tout ce qui te semble bizarre**, même des petits détails — c'est ce qui a permis de corriger tous les bugs des sessions précédentes.

---

## Phase 2 — Je corrige ce que tu as trouvé

Une fois ta liste de la Phase 1 prête, donne-la-moi telle quelle (même en vrac, comme d'habitude) et je corrige un par un, avec la même rigueur que d'habitude (vérification `tsc`/`eslint` + simulation après chaque fix).

---

## Phase 3 — Solidité technique (dette identifiée, à traiter quand Phase 1-2 sont calmes)

Rien d'urgent ni de visible pour un·e utilisateur·rice, mais ça vaut le coup avant que le projet grossisse encore :

1. **README périmé** — il décrit encore une version sans backend, ~30 produits. Je peux le réécrire pour refléter l'état réel (Firebase, 243 produits, macros, cantine, recettes...) en une session courte.
2. **Recettes qui ne comptent pas les quantités** — le moteur vérifie juste "l'ingrédient est prévu aujourd'hui", pas "y en a assez pour la recette". Pas grave pour du MVP, mais à garder en tête si des retours mentionnent des recettes irréalistes.
3. **Hypothèse "cantine fermée le week-end" câblée en dur** — si un jour ça ne correspond pas à ton usage ou à celui de quelqu'un d'autre, on peut la rendre configurable (cocher les jours un par un plutôt que lundi-vendredi fixe).
4. **Pas de tests automatisés** — tout repose sur des vérifications manuelles à chaque session. Fonctionne bien pour l'instant, mais quelques tests (Vitest) sur `generateShoppingList`/`generateMenu` éviteraient des régressions silencieuses si le projet continue de grossir.
5. **Détail mineur dans la config git** — l'URL du remote contient le texte `TON_TOKEN` (jamais remplacé par un vrai jeton). Ça marche apparemment grâce à GitHub Desktop, mais à nettoyer un jour pour éviter une mauvaise surprise si tu clones le repo ailleurs.
6. **Fiabilité des prix** — beaucoup de produits ont `priceSource: "estimation"` plutôt qu'un vrai prix relevé. Je peux vérifier la proportion exacte et te dire si ça vaut le coup de relancer le script de catalogue pour en couvrir plus.

---

## Phase 4 — Idées d'amélioration produit (à prioriser ensemble, aucune urgence)

Des pistes concrètes selon ce qui existe déjà, à ne prendre que si elles te parlent :

- **Notifications/rappels** — un rappel hebdomadaire ("génère ta liste de la semaine") pourrait augmenter l'usage régulier, à évaluer une fois le pilote lancé.
- **Système de substitution rapide** — un bouton "je n'aime pas cet aliment, remplace-le" directement depuis "Ma liste", sans repasser par tout le formulaire.
- **Suivi du budget réel vs prévu** — permettre de cocher "j'ai dépensé X€ au final" pour comparer à la prévision, utile pour affiner les prix du catalogue avec le temps.
- **Export de la liste vers une appli de notes/Google Keep** — en plus du PDF déjà existant, pour celleux qui préfèrent une liste sur leur téléphone sans PDF.

---

## Comment on procède maintenant

Dis-moi simplement où tu veux commencer : la Phase 1 toi-même en autonomie (et tu me rapportes les bugs), ou directement un point précis de la Phase 3/4 si quelque chose te tient à cœur. Je m'adapte à ce que tu préfères attaquer en premier.
