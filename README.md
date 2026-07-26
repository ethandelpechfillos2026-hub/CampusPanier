# CampusPanier

Application web progressive (PWA) mobile-first pour étudiant·es français·es. CampusPanier génère une liste de courses adaptée au budget hebdomadaire, au type d'alimentation, aux allergies et aux préférences personnelles.

**Pilote prévu :** rentrée 2026 sur 1 à 2 campus.

## Concept

Beaucoup d'étudiant·es peinent à concilier alimentation équilibrée et budget limité. CampusPanier propose un parcours simple en 4 étapes :

1. **Budget** — montant hebdomadaire en euros
2. **Alimentation** — omnivore, végétarien, végan, sans porc, halal…
3. **Allergies** — gluten, lactose, fruits à coque, etc.
4. **Préférences** — envies ou contraintes libres (texte court)

L'application filtre un catalogue mocké de produits et compose un panier dans la limite du budget saisi. Si le budget est très bas (< 25 €/sem.), un encart discret oriente vers des associations d'aide alimentaire étudiante (Cop1, Linkee, Agoraé) — sans jugement.

## Stack technique

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** — design sobre, couleurs chaleureuses, mobile-first
- **Données mockées** — `data/products.json` (~30 produits avec prix, catégories, tags régime/allergènes)
- **PWA** — `public/manifest.json`, icônes, installable sur mobile

Pas de backend pour l'instant : toute la logique tourne côté client.

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # build production
npm run start   # serveur production
```

## Structure du projet

```
app/
  page.tsx              # Accueil + onboarding (4 étapes)
  resultats/page.tsx    # Liste de courses générée
  a-propos/page.tsx     # Page concept
components/             # UI (formulaire, résultats, bannière aide)
data/products.json      # Catalogue mocké
lib/
  types.ts              # Types et constantes
  generateShoppingList.ts  # Filtrage et génération du panier
public/
  manifest.json         # Manifest PWA
  icons/                # Icônes d'installation
```

## Prochaine étape

Intégrer une **vraie source de prix** — de préférence via un **partenariat** avec une enseigne ou une API officielle, plutôt que du scraping, pour garantir des données fiables et à jour.

## Licence

Projet pilote — usage interne / campus partenaires.
