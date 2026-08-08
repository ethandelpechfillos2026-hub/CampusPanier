# Rapport — pack juridique CampusPanier

Rédigé le 8 août 2026, à partir d'un audit du code (pas de suppositions). Trois parties : ce qui est fait, ce que toi seul peux compléter, ce qui doit passer devant un·e juriste avant un lancement public large.

---

## 1. Ce qui est couvert

**Documents créés, accessibles dans l'app** (footer sur tout écran + lien "Réglages") :

- `/mentions-legales`
- `/cgu` (conditions pour la bêta gratuite)
- `/confidentialite` (politique RGPD)
- `/cookies`
- `/parametres` — nouvelle page avec suppression de compte réelle

**Suppression de compte (article 17 RGPD)** — n'existait pas avant. Maintenant : supprime le profil Firestore, retire la personne des listes partagées (la liste reste pour les autres), supprime le compte Google/Firebase, efface tout le stockage local de l'appareil. Confirmation par saisie du mot "SUPPRIMER".

**Consentement santé explicite** — case à cocher ajoutée en première étape du profil, avant toute saisie d'allergies/poids/régime. Non cochée par défaut. Date du consentement enregistrée avec le profil.

**Deux erreurs corrigées dans l'app elle-même**, trouvées pendant l'audit :

- SignIn affirmait "aucune donnée n'est partagée" — faux (Firebase, Groq, et les colocataires d'une liste partagée reçoivent des données). Texte corrigé.
- Le formulaire de profil affirmait que poids/taille/âge ne sont "jamais stockés ailleurs que dans ce calcul" — faux, ils sont enregistrés dans Firestore. Corrigé.
- La page `/a-propos` (orpheline, pas liée dans la nav) annonçait encore des prix "mockés" — c'est périmé depuis les prix Open Prices de cette session. Corrigé.

**Brouillon CGV Stripe V2** — `CGV-STRIPE-V2-BROUILLON.md`, pas publié, pas lié dans l'app. Couvre prix/durée, facturation, résiliation en ligne, droit de rétractation avec consentement exprès + renoncement (contenu numérique à accès immédiat), médiation de la consommation.

**Fichier de placeholders** — `A-COMPLETER-AVANT-PUBLICATION.md`, la liste unique de tout ce que seul toi peux remplir.

Tout vérifié avec `tsc` et `eslint` — aucune erreur.

---

## 2. Ce que tu dois compléter

Tout est listé dans `A-COMPLETER-AVANT-PUBLICATION.md`, avec un marqueur jaune visible directement dans les pages tant que ce n'est pas rempli :

- Ton identité légale (nom, statut, adresse, e-mail de contact)
- Nom du directeur de publication
- Adresse Vercel à jour + région exacte de ton projet Firebase
- Décision : âge minimum d'utilisation
- Décision : durée de conservation des données
- Décision : faut-il un vrai export complet du profil (pas juste PDF d'une liste) ?

Pour vérifier qu'il n'en reste plus aucun avant publication :

```
grep -rn "À COMPLÉTER" app/
```

---

## 3. Ce qui nécessite un·e juriste

Marqué en rouge directement dans les pages (`[À VÉRIFIER PAR UN JURISTE]`) :

- L'entité Google exacte (Ireland ou LLC) et la localisation réelle des données Firebase, pour la section transferts hors UE
- Les conditions de traitement des données de Groq (l'IA qui génère les recettes) — durée de rétention, éventuel réentraînement
- La formulation de la clause de limitation de responsabilité dans les CGU, au regard des clauses abusives interdites
- L'exemption de bandeau cookies (traceurs jugés "strictement nécessaires") — à confirmer pour l'usage précis du script de connexion Google
- Les règles de sécurité Firestore réelles (pas dans ce dépôt de code, à vérifier dans la console Firebase)
- Pour la V2 Stripe uniquement (pas urgent) : la formulation exacte du consentement exprès + renoncement au droit de rétractation, et le parcours de résiliation en 3 clics

Comme toujours : ceci n'est pas un conseil juridique, juste un premier jet construit honnêtement à partir du code. Une relecture professionnelle reste nécessaire avant toute diffusion au-delà de tes proches.

---

## À faire de ton côté maintenant

1. Teste le parcours sur ton téléphone : inscription (nouvelle case à cocher), suppression de compte, liens du footer.
2. Remplis `A-COMPLETER-AVANT-PUBLICATION.md`.
3. Commit + push quand tu es prêt — rien n'a encore été poussé.
