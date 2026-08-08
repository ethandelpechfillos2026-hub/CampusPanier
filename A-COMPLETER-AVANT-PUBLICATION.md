# À compléter avant publication — pack juridique CampusPanier

Ce fichier liste tout ce que je (l'assistant) ne peux pas déduire du code et que toi seul peux fournir. Tant que ces champs contiennent un `[À COMPLÉTER]`, les pages légales de l'app affichent le même marqueur en jaune directement dans le texte — impossible de les rater.

Une fois rempli, remplace le texte correspondant dans chaque page concernée (`app/mentions-legales/page.tsx`, `app/cgu/page.tsx`, `app/confidentialite/page.tsx`).

---

## Identité de l'éditeur (mentions légales + confidentialité)

- Nom et prénom (ou dénomination sociale si tu crées une structure) :
- Statut : personne physique / auto-entrepreneur / société — précise la forme :
- Numéro SIREN/SIRET, si tu as une structure :
- Adresse postale (domicile ou siège) :
- Adresse e-mail de contact publique :
- Numéro de téléphone (facultatif) :
- Nom du/de la directeur·rice de publication (en général toi-même si tu es seul éditeur) :

## Hébergement

- Adresse actuelle de Vercel Inc. — à copier depuis vercel.com/legal au moment de la publication (elle peut changer, donc ne pas se fier à une valeur figée dans ce fichier) :
- Région de données du projet Firebase — visible dans la console Firebase, onglet paramètres du projet (ex. europe-west, us-central...) :

## Décisions produit à trancher

- **Âge minimum d'utilisation** : l'app ne vérifie aujourd'hui aucun âge. Tu vises des étudiant·es, potentiellement dès le lycée/prépa. Décide un âge minimum (ex. 15 ans) et dis-moi si tu veux que je l'ajoute comme vérification réelle (case à cocher "j'ai plus de X ans") ou juste comme mention dans les CGU.
- **Durée de conservation des données** : aujourd'hui, rien ne supprime automatiquement un profil inactif. Deux options : (a) assumer "conservation jusqu'à suppression par l'utilisateur·rice", ou (b) fixer une durée (ex. suppression après 24 mois d'inactivité) — dans ce cas il faudra que je code un mécanisme de purge, ce qui n'existe pas actuellement.
- **Export complet du profil** : le droit à la portabilité RGPD est aujourd'hui couvert a minima (export PDF d'une liste passée uniquement). Si tu veux un vrai bouton "exporter toutes mes données" (JSON), dis-le-moi, ce n'est pas encore développé.

## Contacts pour la V2 Stripe (à préparer en avance, pas besoin maintenant)

- Adresse e-mail dédiée aux réclamations clients :
- Nom de l'entité de médiation de la consommation à laquelle tu adhéreras (obligatoire en France pour toute vente à des consommateurs) — à choisir et payer une adhésion avant le premier paiement encaissé :
- Numéro de TVA intracommunautaire, si applicable :

---

## Comment vérifier que tout est rempli

Cherche `[À COMPLÉTER` dans le dossier `app/` — tant qu'il y a un résultat, une page légale contient encore un placeholder visible pour les visiteurs.

```
grep -rn "À COMPLÉTER" app/
```
