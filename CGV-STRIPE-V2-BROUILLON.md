# CGV — Abonnement CampusPanier (brouillon V2, NON PUBLIÉ)

**Ce document n'est pas lié depuis l'application et ne doit pas l'être avant l'activation réelle d'un paiement Stripe.** Il sert de base de travail à finaliser au moment où l'abonnement payant sera prêt à être lancé — voir la checklist en bas de fichier avant toute publication.

Contexte factuel actuel (pour rappel, à la date de rédaction) : aucune fonctionnalité payante n'existe dans le code. Ce brouillon anticipe une V2 avec abonnement Stripe, sur la base de l'appétence testée dans le questionnaire bêta (mentionné à 2€/mois pour menu détaillé, recettes IA illimitées, historique complet — voir ROADMAP.md section 7). **Ce prix n'est pas figé, à confirmer avant publication.**

---

## 1. Objet

Les présentes conditions générales de vente (CGV) régissent la souscription à l'offre payante de CampusPanier (ci-après "l'Abonnement"), en complément des CGU qui régissent l'usage général de l'application.

## 2. Prix, devise, durée

- Prix TTC : `[DÉCISION À PRENDRE — montant final, ex. 2,00 € TTC/mois]`
- Devise : euros (EUR).
- Durée : abonnement mensuel avec reconduction tacite, sauf résiliation avant la date de renouvellement.
- `[DÉCISION À PRENDRE — proposer aussi un tarif annuel avec réduction, ou rester mensuel uniquement au lancement ?]`

## 3. Essai gratuit

`[DÉCISION À PRENDRE — essai gratuit ou non ? Si oui, durée (ex. 7 jours), et préciser explicitement la date exacte du premier prélèvement pour éviter tout reproche de prélèvement surprise.]`

## 4. Facturation

Une facture est générée automatiquement par Stripe à chaque prélèvement et envoyée par e-mail à l'adresse associée au compte. Elle est également consultable depuis l'espace client Stripe (lien à intégrer dans l'espace utilisateur de l'app).

## 5. Annulation / résiliation

L'utilisateur·rice peut résilier son abonnement à tout moment, en ligne, depuis son espace utilisateur, en un minimum de clics (obligation légale française de résiliation aussi simple que la souscription — loi du 16 août 2022, dite "résiliation en 3 clics"). La résiliation prend effet à la fin de la période déjà payée ; aucun remboursement au prorata n'est dû pour la période en cours, sauf disposition contraire ci-dessous.

`[À VÉRIFIER PAR UN JURISTE — s'assurer que le parcours de résiliation prévu respecte précisément le décret d'application de la loi "résiliation en 3 clics" (bouton clairement identifiable, pas de dialogue commercial imposé avant résiliation, confirmation immédiate).]`

## 6. Droit de rétractation — contenu numérique à exécution immédiate

Conformément à l'article L221-18 du Code de la consommation, les consommateurs disposent en principe d'un délai de rétractation de 14 jours. Toutefois, l'article L221-28 13° prévoit une exception pour la fourniture d'un contenu numérique non fourni sur support matériel dont l'exécution a commencé avant la fin du délai de rétractation, à condition que :

1. le consommateur ait donné son **accord préalable exprès** pour que l'exécution commence avant la fin du délai de rétractation, et
2. le consommateur ait **expressément renoncé** à son droit de rétractation.

**Si l'accès à l'Abonnement démarre immédiatement après paiement** (ce qui sera probablement le cas ici), le parcours de souscription doit donc inclure, avant le paiement, deux cases à cocher (ou une case unique au texte cumulant clairement les deux) non pré-cochées :

- "Je demande à bénéficier immédiatement de l'Abonnement, sans attendre la fin du délai de rétractation de 14 jours."
- "Je reconnais que je renonce ainsi à mon droit de rétractation une fois l'accès activé."

`[À VÉRIFIER PAR UN JURISTE — confirmer la formulation exacte à faire valider, et vérifier si un début d'exécution partiel (ex. accès immédiat mais premier prélèvement différé) change l'analyse.]`

## 7. Médiation de la consommation

Conformément à l'article L616-1 du Code de la consommation, tout consommateur a le droit de recourir gratuitement à un médiateur de la consommation en cas de litige non résolu directement avec l'éditeur. `[À COMPLÉTER — nom, adresse et site du médiateur choisi ; une adhésion payante à un médiateur agréé est obligatoire avant le premier encaissement.]`

## 8. Contact réclamation

Pour toute réclamation relative à l'Abonnement : `[À COMPLÉTER — adresse e-mail dédiée]`.

## 9. Droit applicable

Les présentes CGV sont soumises au droit français.

---

## Checklist avant d'activer et de publier cette V2

- [ ] Prix, devise, durée et politique d'essai gratuit tranchés et remplis ci-dessus.
- [ ] Médiateur de la consommation choisi et adhésion souscrite.
- [ ] Parcours de paiement Stripe intégré, avec facture automatique et espace client.
- [ ] Case(s) de consentement exprès + renoncement au droit de rétractation intégrées dans l'écran de paiement, avant le bouton de paiement.
- [ ] Bouton de résiliation en ligne fonctionnel, accessible en 3 clics maximum depuis l'espace utilisateur.
- [ ] Ce document relu et validé par un professionnel du droit, puis publié comme page `/cgv` liée depuis le footer et l'écran d'abonnement — pas avant.
