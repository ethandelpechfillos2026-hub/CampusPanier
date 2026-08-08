# Confiance dans les prix et le catalogue — audit et plan

Objectif produit : qu'un·e étudiant·e au budget serré fasse confiance à la liste, même quand le prix affiché n'est "que" une estimation honnête plutôt qu'un relevé exact. Ce document audite l'existant, compare les sources de données possibles, et propose un plan en 3 niveaux.

---

## 1. Audit de l'existant

### Ce qui existe aujourd'hui

Le catalogue (`data/products.json`, 243 produits) est construit par `scripts/build-catalog.mjs` à partir de deux bases ouvertes :
- **Open Food Facts (OFF)** — fiches produits : nom, catégorie, nutrition, allergènes, code-barres.
- **Open Prices** — prix relevés par des contributeurs (photo de rayon ou ticket de caisse).

C'est déjà la bonne famille de sources (gratuite, légale, pérenne) — le problème n'est pas la source, c'est ce qu'on en fait.

### Trois problèmes concrets trouvés en creusant le code et les données

**a. Le prix "réel" n'est pas si réel qu'annoncé.** `fetchRealPrice()` interroge Open Prices sans filtrer par pays, puis fait la **moyenne brute de tous les relevés retournés** (n'importe quel pays, n'importe quelle date, jusqu'à 3-4 ans d'écart possible), et jette ensuite le détail. Résultat : un produit marqué `priceSource: "open-prices"` peut être une moyenne d'un relevé parisien de 2024 et d'un relevé... espagnol ou allemand de 2023, sans que rien ne le distingue d'un vrai prix propre.

J'ai vérifié en interrogeant l'API en direct (produit Nutella, à titre d'exemple) : chaque relevé individuel contient en réalité une date précise (`"date": "2024-01-11"`), une enseigne (`"osm_brand": "Carrefour"`, `"Super U"`, `"E.Leclerc"`...) et une ville (`"osm_address_city": "Villeurbanne"`...). **Cette information existe déjà côté Open Prices, mais le script actuel ne la récupère jamais.**

**b. Répartition actuelle du catalogue :**
- 93 produits (38 %) — `priceSource: "open-prices"` — un "vrai" prix, mais sans date ni enseigne ni ville conservées (voir point a).
- 150 produits (62 %) — `priceSource: "estimation"` — une moyenne générique par rayon (ex : 2,50 € pour toute l'épicerie), la même pour de la farine et un pot de tapenade.
- 0 produit avec le code-barres conservé — donc impossible aujourd'hui de "rafraîchir" un prix existant sans redemander une recherche complète à OFF, avec le risque de retomber sur une fiche légèrement différente.

**c. Aucune indication de fiabilité n'est montrée à l'écran.** Ni dans "Ma liste" ni ailleurs : un prix "estimation catégorie" et un prix "vrai relevé" s'affichent exactement pareil. C'est précisément la source de la sensation "ça a l'air approximatif" que tu décris.

### Le vrai problème architectural

`Product` mélange aujourd'hui trois choses différentes dans un seul objet plat :
1. **Identité nutritionnelle** (nom, kcal, allergènes...) — vient d'OFF, stable, fiable.
2. **Fiche commerciale** (nom affiché, unité d'achat) — parfois un nom OFF brut, parfois retouché à la main.
3. **Prix** — un simple nombre, sans contexte (enseigne ? zone ? date ? fiabilité ?).

Rien ne distingue ces trois couches dans le code, donc rien ne peut les distinguer à l'écran non plus.

---

## 2. Comparatif des sources de prix possibles

| Option | Source | Légal / CGU | Coût | Effort technique | Fraîcheur | Couverture géo | Expérience utilisateur |
|---|---|---|---|---|---|---|---|
| **Open Prices (corrigé)** | Communautaire (OFF) | ✅ Licence ouverte (ODbL) | Gratuit | Faible-moyen (corriger le script existant) | Variable — certains produits ont des relevés récents et locaux, d'autres aucun | France entière mais inégale (~50 000 prix au monde, concentrés sur les produits populaires et les grandes villes) | Honnête si bien affiché : "Carrefour, Villeurbanne, relevé le 11/01/2024" |
| **Scraping direct Lidl/Carrefour/Auchan/U/Leclerc/Intermarché** | Sites des enseignes | ❌ Interdit par leurs CGU | Gratuit à court terme | Élevé (contournement anti-robot, maintenance continue) | Très fraîche si ça marche | Nationale | Risque juridique qui grandit avec le succès de l'appli — écarté |
| **API/flux partenaire enseigne** | Direct enseigne | ✅ si accord obtenu | Inconnu, probablement payant ou nécessite un volume d'affaires | Élevé (démarches commerciales, pas de garantie de réponse) | Très fraîche | Selon l'enseigne | Idéal si obtenu, mais peu réaliste pour un pilote étudiant à ce stade |
| **Comparateurs existants (Que Choisir Ensemble, LeBonDrive...)** | Tiers agrégateurs | ⚠️ Site public, mais pas de licence de réutilisation en API — les republier reviendrait au même problème que le scraping | Gratuit à consulter, pas réutilisable proprement | — | Quotidienne | Nationale (drives) | Écarté pour l'instant (statut légal de réutilisation pas clair) |
| **Panels commerciaux (Nielsen/IRI-Circana, LSA Expert)** | Fournisseurs B2B | ✅ Payant, contractuel | Élevé (typiquement plusieurs milliers d'€/mois, tarifs entreprise) | Moyen (intégration API une fois l'accès payé) | Très fraîche | Nationale | Hors de portée d'un pilote gratuit |
| **API type "MasterCourses"** | Startup française | Statut à vérifier — infos trouvées datent de 2015-2016, existence actuelle non confirmée | Historiquement ~9000 €/mois, réduit "par 30" selon une ancienne source (~300 €/mois, à confirmer) | Moyen si l'offre existe encore | Inconnue aujourd'hui | Inconnue aujourd'hui | À vérifier directement avant d'y compter — je ne le recommande pas sans confirmation |
| **Contribution communautaire interne** (les utilisateurs de CampusPanier relèvent eux-mêmes des prix, comme Open Prices) | Utilisateurs de l'appli | ✅ Légal (avec leur consentement) | Gratuit | Moyen (UI de contribution + modération basique) | Dépend de l'activité des utilisateurs | Limitée aux campus actifs | Excellent une fois amorcé, mais nécessite une masse critique d'utilisateurs — pas encore le cas |

---

## 3. Plan en 3 niveaux

### Niveau 1 — Immédiat, avec les données déjà accessibles gratuitement

Ce qu'on peut faire maintenant, sans nouvelle intégration ni argent :

1. **Nouvelle architecture de données** : remplacer le champ plat `priceSource` par un objet `priceInfo` clair : `{ source: "open-prices" | "estimation", date?, enseigne?, zone? }`. Sépare visiblement "fiche nutritionnelle" (déjà correct) / "fiche commerciale" (nom affiché) / "prix avec provenance".
2. **Corriger `build-catalog.mjs`** : ne garder que les relevés Open Prices situés en France, trier par date, choisir le relevé le plus récent (avec son enseigne et sa ville) plutôt qu'une moyenne aveugle. Conserver aussi le code-barres OFF sur chaque produit pour pouvoir rafraîchir un prix plus tard sans tout redemander.
3. **Affichage honnête dans "Ma liste"** : une petite mention par ligne — *"estimation"* ou *"Carrefour, Villeurbanne · 11/01/2024"* selon le cas. Une ligne de texte, pas un nouvel écran — reste "hyper simple".
4. **Migrer les 243 produits existants** vers le nouveau format, sans inventer de fausses dates : les 93 "open-prices" actuels passent en "prix déjà observé, détail non conservé" (honnête sur la limite), les 150 "estimation" restent clairement marqués comme tels.
5. **Élargir le catalogue** via plus de termes de recherche OFF (comme déjà évoqué), mais désormais chaque nouveau produit aura une vraie provenance de prix dès l'ajout.

**Limite à connaître** : mon environnement de travail actuel n'a pas d'accès réseau direct à Open Food Facts/Open Prices pour lancer `build-catalog.mjs` moi-même (testé, bloqué). Je peux corriger et vérifier tout le code ci-dessus, mais **le rafraîchissement complet des 243 prix devra être lancé par toi** avec `npm run build-catalog` sur ton ordinateur (une seule commande, déjà conçue pour reprendre où elle s'arrête si interrompue).

### Niveau 2 — MVP réaliste pour des prix plus crédibles par enseigne

Une fois le niveau 1 en place et un peu de recul sur ce qu'Open Prices couvre vraiment :

1. **Choix d'enseigne + ville dans le profil** (une fois, pas à chaque liste) : "Tu fais tes courses plutôt chez... à...".
2. **Recherche ciblée** : pour chaque produit, chercher d'abord un relevé Open Prices de CETTE enseigne dans CETTE zone (ou à défaut, dans un rayon large) datant de moins de ~60 jours. Si trouvé → affiché avec sa provenance complète.
3. **Repli par indice d'enseigne** si pas de relevé assez précis : plutôt qu'une estimation générique unique, calculer un indice par enseigne (ex : enseignes hard-discount ~15-20 % moins chères que la moyenne, à partir de ce qu'Open Prices sait déjà au niveau national) — plus honnête qu'un chiffre unique valable "nulle part en particulier".
4. Nécessite de calculer ces indices une fois (à partir des données Open Prices déjà disponibles) et de les stocker dans le catalogue.

**Effort** : plusieurs sessions. **Coût** : 0 €. **Limite honnête à annoncer à l'utilisateur** : la précision par enseigne/ville dépendra de combien de contributeurs Open Prices sont déjà passés dans sa zone — meilleure dans les grandes villes, plus faible ailleurs.

### Niveau 3 — Partenariats, données payantes ou contribution utilisateur à grande échelle

À envisager seulement si le pilote prend de l'ampleur (lié à la phase monétisation déjà dans `ROADMAP.md`) :

- Démarcher directement une enseigne pour un flux partenaire/affilié — improbable tant que CampusPanier est un projet étudiant sans traction démontrée, mais pas à exclure une fois des chiffres d'usage réels à montrer.
- Panel commercial payant (Nielsen/IRI-Circana, LSA Expert) — probablement des milliers d'euros par mois, pertinent seulement si l'appli génère déjà des revenus.
- Construire un système de contribution interne (les utilisateurs de CampusPanier relèvent eux-mêmes des prix dans l'appli, comme Open Prices) — gratuit et pérenne à terme, mais demande une vraie base d'utilisateurs actifs pour être fiable ; à réévaluer après le pilote sur 1-2 campus.

---

## Recommandation et première étape

**Commencer par le Niveau 1.** C'est gratuit, légal, ne dépend de personne d'autre, et résout directement le problème de fond : arrêter d'afficher un prix sans dire d'où il vient. C'est aussi le prérequis technique du Niveau 2 (on ne peut pas choisir une enseigne si le prix n'a pas d'enseigne associée).

**Implémenté dans cette session** (détail technique après vérification) :
- Nouveau type `PriceInfo` + champ `offCode` pour pouvoir rafraîchir un prix plus tard.
- `build-catalog.mjs` corrigé : filtre France, tri par date, garde le relevé le plus récent avec son enseigne/ville, conserve le code-barres.
- Migration des 243 produits existants vers le nouveau format (sans invention de données).
- Affichage de la provenance/fraîcheur du prix dans "Ma liste".

**Reste à faire de ton côté** : lancer `npm run build-catalog` sur ton ordinateur quand tu veux réellement rafraîchir/élargir les prix avec la version corrigée du script (ça peut prendre du temps selon le nombre de nouveaux termes de recherche — le script est conçu pour reprendre s'il est interrompu).
