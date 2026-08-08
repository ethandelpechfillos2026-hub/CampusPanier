# Plan d'amélioration CampusPanier (hors légal/CGU/Stripe)

Comme demandé : tout ce qui est mentions légales, CGU/CGV et Stripe reste dans `ROADMAP.md` pour une phase séparée, plus tard. Ce document se concentre uniquement sur l'app elle-même — la tester, la solidifier, l'améliorer. Suis les phases dans l'ordre, chacune a des étapes précises.

---

## Phase 1 — QA manuelle (à faire toi-même, ~30-45 min)

Avant d'ajouter quoi que ce soit de nouveau, vérifie que tout ce qui a été construit récemment marche vraiment sur ton téléphone. Coche au fur et à mesure :

1. Profil végane + allergie gluten + petit budget (15€) → liste cohérente ou message "budget insuffisant" propre.
2. Profil omnivore + gros budget (80€) + Mode Performance + "prise de masse" → calories/macros affichées cohérentes, aliments bruts.
3. Profil sans porc + "Gourmand" coché → un vrai repas à chaque créneau, pas que du plaisir sucré/gras.
4. Active "Cantine le midi" → déjeuner vide en semaine avec le message cantine, week-end normal, total de la liste plus bas qu'sans l'option.
5. Ajuste tes macros à la main (étape 3 du profil) → le nombre de calories affiché change bien en bougeant les curseurs.
6. Va dans "Mes recettes", change de jour → les recettes proposées changent selon ce qui est réellement prévu ce jour-là.
7. Génère 3-4 recettes IA d'affilée → elles varient et respectent régime/allergies.
8. Historique → ouvre une liste passée, teste impression/export PDF, vérifie que les quantités ×2/×3 s'affichent bien si présentes.
9. Installe l'app sur l'écran d'accueil (iPhone et/ou Android) → l'icône s'affiche bien.
10. Coche tous les articles d'une liste jusqu'au bout → badge "Liste parfaite".
11. Si possible, teste la liste coloc à deux téléphones → ordre et coches restent synchronisés.

**Note tout ce qui te semble bizarre**, même des petits détails — c'est ce qui a permis de corriger tous les bugs de la session précédente.

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
