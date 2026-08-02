# Checklist mentions légales — CampusPanier

Ceci n'est pas un conseil juridique définitif (je ne suis pas avocat) — c'est
une checklist pratique de ce qu'il faut prévoir, à faire relire par un
professionnel avant la mise en ligne définitive, surtout une fois l'abonnement
payant activé.

## À faire dès maintenant (avant d'envoyer le lien à un public large)

Ces deux documents sont obligatoires dès qu'un site collecte des données
personnelles ou est accessible publiquement en France — donc dès maintenant,
puisque l'app utilise la connexion Google et stocke des préférences dans
Firestore.

### 1. Mentions légales
Obligatoires pour tout site web en France (article 6 de la LCEN).

- Identité de l'éditeur : ton nom, ton statut (pour l'instant "éditeur à
  titre non professionnel" ou équivalent, à mettre à jour avec ton numéro
  SIRET une fois auto-entrepreneur)
- Adresse email de contact (pas besoin d'adresse postale si tu es un
  particulier pour l'instant)
- Nom de l'hébergeur : Vercel Inc., avec son adresse (disponible sur le site
  de Vercel)
- Directeur de la publication : toi

### 2. Politique de confidentialité (RGPD)
Obligatoire dès qu'on collecte des données personnelles — ici : compte
Google (nom, email, photo), régime alimentaire, allergies, objectifs
caloriques/macros.

- Quelles données sont collectées et pourquoi (générer la liste de courses,
  personnaliser les recettes)
- Base légale du traitement (consentement / exécution du service demandé)
- Qui a accès aux données : Google/Firebase (authentification + base de
  données Firestore), Vercel (hébergement du site) — et plus tard Stripe une
  fois le paiement actif
- Durée de conservation des données
- Droits de l'utilisateur : accès, rectification, suppression, portabilité,
  opposition — et comment les exercer (ton email de contact)
- Mention sur le stockage local du navigateur (localStorage) utilisé pour
  les favoris, les stats de progression et les badges
- Précision : les préférences alimentaires/allergies sont traitées avec soin
  car elles peuvent être assimilées à des données de santé au sens du RGPD —
  vaut le coup de le mentionner explicitement et de demander un accord clair
  à l'inscription

### 3. CGU — Conditions Générales d'Utilisation
Encadrent l'usage du service, même gratuit.

- Description du service (génération de liste de courses, menu, recettes) —
  et rappel que ce n'est pas un avis médical ou nutritionnel professionnel
- "Prix indicatifs, non contractuels" (déjà affiché dans l'app, à reprendre
  ici formellement)
- Compte utilisateur : connexion via Google, responsabilité de
  l'utilisateur sur son propre compte
- Usages interdits (détournement, extraction massive de données, etc.)
- Propriété intellectuelle : le contenu, le nom et le logo CampusPanier
  t'appartiennent
- Limitation de responsabilité (l'app aide à faire des courses, elle ne
  garantit pas un résultat nutritionnel précis)
- Conditions de suspension/suppression d'un compte
- Droit applicable : droit français, tribunaux compétents

## À faire avant d'activer l'abonnement Stripe (pas maintenant)

### 4. CGV — Conditions Générales de Vente
Obligatoires dès qu'on vend quelque chose, même à 2€/mois.

- Description précise de l'offre payante (2€/mois, ce qu'elle débloque)
- Modalités de paiement : Stripe, prélèvement mensuel automatique
- Droit de rétractation : 14 jours pour un consommateur en France, avec une
  règle spécifique au contenu numérique (le client peut renoncer à ce délai
  s'il demande explicitement un accès immédiat — à formuler clairement au
  moment du paiement)
- Modalités de résiliation : doit être "en 3 clics" depuis l'app
  (obligation légale depuis juin 2023, voir plus bas)
- Politique de remboursement en cas de problème
- Modalités de modification du prix (préavis à respecter si le prix change)

### 5. Fonction de résiliation "en 3 clics"
Ce n'est pas un texte juridique mais une obligation technique liée aux CGV :
un bouton "Résilier mon abonnement" facilement visible et accessible dans
l'app, pas seulement par email. À développer en même temps que
l'intégration Stripe.

## Pas nécessaire pour l'instant

- Bandeau de cookies : pas de traceur tiers (publicité, analytics externe)
  identifié actuellement dans l'app, donc pas obligatoire tant que ça reste
  le cas.

## Prochaine étape

Une fois que tu valides cette liste, je peux rédiger le contenu complet de
chaque document (mentions légales, politique de confidentialité, CGU), les
ajouter comme pages dans l'app, et les lier depuis le footer ou l'écran de
connexion. Les CGV et la résiliation en 3 clics, on les fera au moment où
Stripe sera branché.
