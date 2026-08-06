
# Feuille de route CampusPanier — pour la suite de l'aventure

Document préparé le 3 août 2026, pendant que tu es en déplacement (retour prévu dimanche). Il couvre où en est le projet, ce qui est urgent, ce qui peut attendre, et un plan étape par étape pour chaque chantier. Traite-le comme un premier jet à ajuster ensemble dimanche, pas comme une liste figée — tu connais tes priorités (temps disponible, date de rentrée, budget) mieux que moi.

---

## 1. Où en est CampusPanier aujourd'hui

L'app a beaucoup avancé cette session : ce qui n'était au départ qu'un générateur de liste de courses basique est devenu un vrai compagnon budget/nutrition avec :

- **Authentification Google + Firestore** pour sauvegarder profil, favoris et historique d'un appareil à l'autre.
- **Catalogue de 243 produits** français (contre ~30-80 au départ), sourcé via Open Food Facts/Open Prices, avec deux passes de correction manuelle des associations produit erronées.
- **Profil corporel complet** (sexe, poids, taille, âge) pour calculer un repère personnalisé de calories et de grammes de protéines/lipides/glucides (formule de Mifflin-St Jeor), avec possibilité d'ajuster les macros à la main.
- **Mode Performance** pour les sportif·ves : calories obligatoires, objectif prise de masse/sèche, exclusion des produits ultra-transformés.
- **Algorithme de liste de courses** qui garantit un repas réel à chaque créneau (fini les dîners à 25 g de fromage râpé), plafonne la variété par catégorie pour privilégier de plus grosses quantités de moins de produits, et priorise les protéines quand le besoin calorique est élevé.
- **"Mon menu" jour par jour** avec répartition hebdomadaire lissée (fini les "lundi rien, mercredi une baguette entière"), affichage en grammes pour les aliments non divisibles (fruits, boissons) et en fractions pour le pain/agrumes, et un partage déjeuner/dîner équivalent mais jamais identique.
- **Option "Cantine le midi"** pour les étudiant·es qui ne mangent pas à la maison à midi en semaine : réduit les quantités achetées en conséquence et adapte le menu.
- **Recettes scopées au jour réellement prévu** dans "Mon menu" (fini les recettes qui piochaient dans le stock d'un autre jour), avec génération de recette IA (Groq).
- **Liste partagée entre coloc·s** (code d'invitation, cases à cocher synchronisées en temps réel, ordre d'affichage cohérent entre appareils).
- **Historique, favoris, impression/export PDF, badges de progression** (déjà en place avant cette session, non retouchés ici).

Tout ce qui précède a été vérifié à chaque étape avec `tsc --noEmit`, `eslint` et des simulations de génération de liste/menu sur plusieurs profils (petit budget, végane, performance...). Rien n'a été poussé sans repasser par cette checklist.

---

## 2. Priorité 0 — À régler avant d'envoyer le lien à qui que ce soit

C'est le point le plus urgent et il n'est **pas encore fait**, alors que ton propre fichier `checklist-mentions-legales-campuspanier.md` (déjà dans le repo) le liste comme "à faire dès maintenant". L'app utilise déjà la connexion Google et stocke des données dans Firestore (régime, allergies, objectifs caloriques) — légalement, les mentions légales et la politique de confidentialité doivent exister *avant* que qui que ce soit d'autre que toi utilise l'app, même juste tes proches pour un premier retour.

**Étapes précises :**
1. Dimanche, dis-moi de rédiger le contenu complet des 3 documents listés dans ta checklist : mentions légales, politique de confidentialité (RGPD), CGU. J'ai déjà tout le contexte nécessaire (hébergeur Vercel, auth Google/Firebase, données collectées) pour un premier jet solide.
2. On les ajoute comme pages dans l'app (`/mentions-legales`, `/confidentialite`, `/cgu`) et on les lie depuis le footer ou l'écran de connexion.
3. Tu les fais relire par un professionnel avant diffusion large (ton fichier le précise déjà — je ne suis pas avocat, et je le redis ici pour que ce soit clair).
4. Les CGV et la résiliation "en 3 clics" attendent l'intégration Stripe (pas urgent tant que rien n'est payant).

Estimation : une session de travail (1-2h avec moi pour la rédaction + intégration), puis le temps que tu trouves pour la relecture professionnelle.

---

## 3. Priorité 1 — Vérifier que tout ce qui a été construit marche vraiment en vrai

Beaucoup de changements se sont enchaînés cette session (macros, quantités, distribution, cantine, recettes). Tout a été vérifié par simulation côté code, mais rien ne remplace un vrai test sur ton téléphone. Ton fichier `questionnaire-retours-campuspanier.md` a déjà une liste de scénarios — je la complète avec les nouveautés récentes :

**Scénarios à tester toi-même (checklist) :**
1. Profil végane + allergie gluten + petit budget (15€) — vérifier qu'un panier complet et cohérent sort quand même, ou que le message "budget insuffisant" s'affiche proprement.
2. Profil omnivore + gros budget (80€) + Mode Performance + "prise de masse" — vérifier que les calories/macros affichées sont cohérentes et que les aliments sont bien "bruts".
3. Profil sans porc + "Gourmand" coché — vérifier qu'il y a quand même un vrai repas à chaque créneau, pas que du plaisir.
4. **Nouveau : active "Cantine le midi"** — vérifier que le déjeuner en semaine affiche bien le message cantine, que le week-end reste normal, et que le total de la liste baisse par rapport à la même config sans cantine.
5. **Nouveau : ajuste tes macros à la main** (étape 3 du profil) — vérifier que le nombre de calories affiché change bien quand tu bouges les curseurs.
6. **Nouveau : va dans "Mes recettes"** et change de jour — vérifier que les recettes proposées changent selon ce qui est réellement prévu ce jour-là, et que les ingrédients "prévus un autre jour" sont bien signalés comme tels.
7. Génère 3-4 recettes IA d'affilée — vérifier qu'elles varient et respectent régime/allergies.
8. Historique : ouvre une liste passée, teste impression/export PDF depuis ton téléphone, vérifie que les quantités ×2/×3 s'affichent correctement si présentes.
9. Installe l'app sur l'écran d'accueil (iPhone et Android si possible) et vérifie l'icône.
10. Coche tous les articles d'une liste jusqu'au bout pour revoir le badge "Liste parfaite".
11. Teste la liste partagée coloc à deux téléphones si possible (toi + quelqu'un) pour confirmer que l'ordre et les coches restent synchronisés.

Note ce que tu trouves (même des petits trucs bizarres) — c'est exactement le genre de retour qui a permis de corriger les bugs de cette session, donc autant continuer sur cette lancée toi-même avant de renvoyer le lien à d'autres.

---

## 4. Priorité 2 — Lancement bêta auprès de tes proches

Ton questionnaire est déjà prêt (`questionnaire-retours-campuspanier.md`) et bien pensé (7 questions, mélange choix/texte libre). Une fois les priorités 0 et 1 traitées :

**Étapes précises :**
1. Crée le Google Form à partir du contenu déjà rédigé (5 minutes sur forms.google.com).
2. Envoie le lien de l'app + le formulaire à un premier petit groupe (5-10 personnes suffisent pour un premier tour).
3. Laisse passer une semaine, relance une fois si besoin.
4. Compile les retours — dis-moi ce qui ressort, je t'aiderai à prioriser les corrections/ajouts avant le tour suivant (pilote campus).

---

## 5. Priorité 3 — Dette technique et solidité (pas urgent, mais à garder en tête)

Rien de bloquant ici, mais des points identifiés pendant cette session qui vaudront le coup d'être traités avant une diffusion plus large :

- **Le moteur de recettes ne compte pas les quantités** — il vérifie juste "cet ingrédient est-il prévu aujourd'hui", pas "y en a-t-il assez pour la recette". Suffisant pour du MVP, mais à garder en tête si des retours mentionnent des recettes irréalistes.
- **L'hypothèse "cantine fermée le week-end"** est câblée en dur (lundi-vendredi uniquement). Si des retours indiquent que ce n'est pas universel, on pourra rendre ça configurable (cocher les jours un par un).
- **Le README est périmé** — il décrit encore une version sans backend, ~30 produits, sans Firebase. À mettre à jour pour refléter l'état réel, utile si tu montres le repo à quelqu'un (partenaire campus, développeur·se qui t'aiderait plus tard).
- **Pas de tests automatisés** — les vérifications reposent sur `tsc`, `eslint` et des scripts de simulation ponctuels à chaque session. Ça a bien fonctionné jusqu'ici, mais si le projet grossit encore, quelques tests automatisés (ex. Vitest) sur `generateShoppingList`/`generateMenu` éviteraient les régressions silencieuses.
- **Détail mineur repéré dans la config git** : l'URL du remote GitHub contient littéralement le texte `TON_TOKEN` (un espace réservé jamais remplacé) plutôt qu'un vrai jeton — ça fonctionne apparemment grâce à GitHub Desktop qui gère l'authentification de son côté, mais si un jour tu clones le repo ailleurs ou changes d'outil, ça pourrait bloquer le push. Pas urgent, juste à nettoyer un jour (`git remote set-url origin https://github.com/ethandelpechfillos2026-hub/CampusPanier.git`).
- **Pas de PWA hors-ligne** — le `manifest.json` permet l'installation sur l'écran d'accueil mais il n'y a pas de service worker pour un usage hors connexion. À évaluer si des retours le demandent (pas indispensable pour une liste de courses).

---

## 6. Priorité 4 — Pilote campus (rentrée 2026)

Le README annonce un pilote sur 1-2 campus à la rentrée 2026 — si "rentrée" veut dire septembre, c'est dans un peu plus d'un mois à partir d'aujourd'hui. Quelques questions à trancher ensemble dimanche pour préparer ça sereinement, pas du tout urgent à coder maintenant mais bon à anticiper :

- Comment les étudiant·es du campus pilote vont-iels découvrir l'app (affiches, BDE, réseaux sociaux du campus) ?
- Faut-il un moyen de savoir combien de personnes l'utilisent activement (un tableau de bord simple, même juste un compteur Firestore) ?
- Le catalogue de prix est-il assez fiable pour un vrai usage (beaucoup de `priceSource: "estimation"` plutôt que des prix relevés) ? Ça vaut le coup de vérifier la proportion avant le pilote.
- Support/contact : un email ou un formulaire pour les étudiant·es qui rencontrent un bug pendant le pilote.

---

## 7. Priorité 5 — Monétisation (après validation du pilote, pas avant)

Ton questionnaire teste déjà l'appétence pour un abonnement à 2€/mois (menu détaillé, recettes IA illimitées, historique). Une fois cette validation faite :

1. Rédaction des CGV (voir checklist légale, section 4).
2. Intégration Stripe (paiement + gestion d'abonnement).
3. Bouton de résiliation "en 3 clics" — obligation légale, à développer en même temps que Stripe.
4. Définir précisément ce qui est gratuit vs payant (le questionnaire suggère déjà une piste : menu détaillé, recettes IA illimitées, historique complet).

---

## 8. Comment reprendre dimanche

Quand tu reviens, tu peux simplement me dire "on reprend la roadmap CampusPanier" et je repartirai de ce document. Si tu veux qu'on attaque directement un chantier précis, dis-le-moi (par exemple "on fait les mentions légales" ou "on corrige ce que j'ai trouvé en testant") et j'irai droit au but sans repasser par tout le reste.

Bon voyage, repose-toi bien. À dimanche.
