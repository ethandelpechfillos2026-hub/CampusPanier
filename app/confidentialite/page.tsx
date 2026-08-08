import LegalLayout from "@/components/LegalLayout";
import { DecisionNeeded, LawyerCheck, Placeholder } from "@/components/LegalPlaceholder";
import PhoneFrame from "@/components/PhoneFrame";

export default function ConfidentialitePage() {
  return (
    <PhoneFrame>
    <LegalLayout title="Politique de confidentialité" updated="8 août 2026">
      <section>
        <p className="italic text-campus-muted">
          Cette page décrit exactement les données que CampusPanier traite, telles qu&apos;elles existent
          aujourd&apos;hui dans le code de l&apos;application, sans supposition. Les points qui nécessitent une
          information que seul l&apos;éditeur peut fournir, ou une vérification juridique, sont signalés
          explicitement.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">1. Responsable de traitement</h2>
        <p className="mt-2">
          <Placeholder>identité de l&apos;éditeur — voir mentions légales</Placeholder>, joignable à{" "}
          <Placeholder>adresse e-mail de contact</Placeholder>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">2. Données collectées</h2>

        <p className="mt-3 font-semibold">a) À la création de compte (via Google)</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Identifiant de compte Google, nom/prénom affiché et adresse e-mail associée à ce compte.</li>
        </ul>

        <p className="mt-3 font-semibold">b) Profil enregistré (base Firestore, document &quot;profiles&quot;)</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Type d&apos;alimentation (omnivore, végétarien, végan, sans porc).</li>
          <li>Allergies déclarées (gluten, lactose, fruits à coque, œuf, arachide).</li>
          <li>Objectif calorique quotidien, préférences de macronutriments (ex. riche en protéines, prise de masse, sèche).</li>
          <li>Sexe, poids, taille, âge (si renseignés, pour affiner le calcul des repères nutritionnels).</li>
          <li>Mode Performance (activé/désactivé) et objectif associé.</li>
          <li>Jours de la semaine où la personne mange à la cantine le midi.</li>
          <li>Enseigne et ville de courses préférées (facultatif).</li>
          <li>Statut et date du consentement explicite donné pour ces informations (voir section 6).</li>
        </ul>

        <p className="mt-3 font-semibold">c) Liste partagée entre colocataires (base Firestore, document &quot;sharedLists&quot;), uniquement si la fonctionnalité est utilisée</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Identifiant et nom (ou nom Google) du/de la propriétaire de la liste et de chaque membre l&apos;ayant rejointe.</li>
          <li>Contenu de la liste de courses (noms de produits, prix, cases cochées, et qui a coché quoi).</li>
          <li>Ces informations sont visibles par toute personne membre de la même liste partagée.</li>
        </ul>

        <p className="mt-3 font-semibold">d) Uniquement sur l&apos;appareil (jamais envoyé à un serveur)</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Listes favorites enregistrées, historique des listes générées, recettes déjà vues, nombre de listes menées à terme — stockés en local (localStorage du navigateur), effacés si le stockage du navigateur est vidé.</li>
        </ul>

        <p className="mt-3 text-xs text-campus-muted">
          CampusPanier ne collecte aucune donnée de paiement à ce jour (aucune fonctionnalité payante n&apos;existe
          dans la version actuelle).
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">3. Finalités et bases légales</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Créer et sécuriser le compte — exécution du contrat (CGU) liant l&apos;utilisateur·rice à l&apos;usage du service.</li>
          <li>Générer des listes de courses et recettes personnalisées à partir du profil — exécution du contrat.</li>
          <li>
            Traiter les informations de profil pouvant révéler des données de santé ou des convictions (allergies,
            poids, taille, âge, objectifs caloriques, régime type &quot;sans porc&quot;) — consentement explicite
            recueilli avant leur saisie (voir section 6), retirable à tout moment en supprimant le compte.
          </li>
          <li>Faire fonctionner la liste partagée entre colocataires — exécution du contrat, à l&apos;initiative de l&apos;utilisateur·rice qui active cette fonctionnalité.</li>
        </ul>
        <p className="mt-2">
          CampusPanier n&apos;utilise aucune donnée à des fins de publicité ciblée ni ne revend aucune donnée à des
          tiers.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">4. Destinataires des données</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Google / Firebase</strong> (authentification et base de données Firestore) — sous-traitant
            technique qui héberge le compte et le profil.
          </li>
          <li>
            <strong>Groq</strong> — lorsque l&apos;utilisateur·rice génère une recette par intelligence artificielle,
            la liste des produits déjà sélectionnés (jamais le nom, l&apos;e-mail ou l&apos;identifiant du compte)
            est envoyée à l&apos;API de Groq pour générer le texte de la recette.{" "}
            <LawyerCheck>
              vérifier les conditions de traitement des données de Groq (politique de confidentialité, durée de
              rétention des requêtes API, éventuel réentraînement de modèle) et les documenter ici
            </LawyerCheck>
            .
          </li>
          <li>
            <strong>Vercel</strong> — hébergeur de l&apos;application (voir mentions légales), qui traite
            techniquement les requêtes réseau pour livrer les pages, sans accès applicatif aux données de profil.
          </li>
          <li>
            <strong>Autres membres d&apos;une liste partagée</strong> — uniquement le nom et le contenu de la liste,
            pour les personnes ayant explicitement rejoint cette liste via son code d&apos;invitation.
          </li>
        </ul>
        <p className="mt-2">
          CampusPanier n&apos;utilise aucun outil d&apos;analyse d&apos;audience, de publicité ou de suivi tiers — le
          code de l&apos;application ne contient aucune dépendance de ce type à ce jour.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">5. Transferts hors Union européenne</h2>
        <p className="mt-2">
          Firebase (Google) et Groq sont des sociétés américaines. Un transfert de données hors de l&apos;Union
          européenne est donc possible selon la région d&apos;hébergement effective choisie pour ces services.{" "}
          <LawyerCheck>
            vérifier la région de données du projet Firebase (console Firebase → paramètres du projet) et le
            mécanisme de transfert encadrant chaque prestataire (clauses contractuelles types, Data Privacy
            Framework, etc.), puis compléter cette section en conséquence — aucun transfert ne doit être présenté
            comme conforme sans cette vérification
          </LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">6. Consentement explicite pour les données sensibles</h2>
        <p className="mt-2">
          Avant de renseigner allergies, poids, taille, âge, objectif calorique ou un régime pouvant révéler une
          conviction (ex. &quot;sans porc&quot;), l&apos;application demande une case à cocher explicite, non
          pré-cochée, expliquant cette finalité. Ce consentement (et sa date) est enregistré avec le profil. Il peut
          être retiré à tout moment en supprimant le compte (voir section 8).
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">7. Durée de conservation</h2>
        <p className="mt-2">
          <DecisionNeeded>
            aucune durée de conservation ni suppression automatique n&apos;est actuellement programmée dans
            l&apos;application — les données de profil et de liste partagée restent en base tant que le compte
            n&apos;est pas supprimé manuellement. Décider d&apos;une durée (ex. suppression après N mois
            d&apos;inactivité) ou assumer explicitement une conservation &quot;jusqu&apos;à suppression du compte par
            l&apos;utilisateur·rice&quot;, et l&apos;indiquer ici avant publication
          </DecisionNeeded>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">8. Vos droits</h2>
        <p className="mt-2">
          Conformément au Règlement général sur la protection des données (RGPD), vous disposez d&apos;un droit
          d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité de vos
          données.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Consulter et modifier</strong> votre profil : bouton &quot;Modifier mes préférences&quot; depuis
            l&apos;écran budget de l&apos;application.
          </li>
          <li>
            <strong>Exporter</strong> une liste de courses : impression/export PDF disponible depuis
            l&apos;historique.{" "}
            <DecisionNeeded>
              aucun export global du profil complet (JSON/PDF de toutes les données personnelles) n&apos;existe
              actuellement — décider si cela doit être ajouté pour couvrir pleinement le droit à la portabilité, ou
              si le traitement manuel d&apos;une demande par e-mail suffit à ce stade
            </DecisionNeeded>
            .
          </li>
          <li>
            <strong>Supprimer</strong> votre compte et vos données : page{" "}
            <a href="/parametres" className="font-semibold text-campus-terracotta underline">
              Réglages → Supprimer mon compte
            </a>
            , qui supprime le profil Firestore, retire votre compte des listes partagées et supprime le compte
            d&apos;authentification.
          </li>
          <li>
            Pour toute autre demande (rectification, opposition, limitation), contact :{" "}
            <Placeholder>adresse e-mail de contact dédiée aux demandes RGPD</Placeholder>.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">9. Décision automatisée</h2>
        <p className="mt-2">
          La composition d&apos;une liste de courses ou d&apos;un menu repose sur un algorithme de sélection selon
          des règles fixes (budget, régime, allergies, calories) — il ne s&apos;agit pas d&apos;un profilage au sens
          du RGPD ni d&apos;une décision produisant des effets juridiques ou similaires significatifs sur la
          personne.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">10. Cookies et traceurs</h2>
        <p className="mt-2">
          Voir notre{" "}
          <a href="/cookies" className="font-semibold text-campus-terracotta underline">
            politique cookies et traceurs
          </a>{" "}
          dédiée.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">11. Mineurs</h2>
        <p className="mt-2">
          <DecisionNeeded>
            l&apos;application ne vérifie actuellement pas l&apos;âge des utilisateur·rices ; le public visé
            (étudiant·es) inclut potentiellement des mineur·es de plus de 15 ans. Décider d&apos;une politique
            d&apos;âge minimum et, le cas échéant, des mesures adaptées (information spécifique, accord parental si
            moins de 15 ans conformément à l&apos;article 8 du RGPD tel que transposé en droit français)
          </DecisionNeeded>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">12. Sécurité</h2>
        <p className="mt-2">
          Les données sont hébergées sur l&apos;infrastructure Google Firebase, protégées par des règles
          d&apos;accès limitant la lecture/écriture au compte concerné.{" "}
          <LawyerCheck>
            faire relire les règles de sécurité Firestore effectivement configurées (non présentes dans ce dépôt de
            code, à vérifier dans la console Firebase) pour confirmer qu&apos;un compte ne peut lire/modifier que ses
            propres données
          </LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">13. Réclamation</h2>
        <p className="mt-2">
          Vous pouvez introduire une réclamation auprès de la Commission nationale de l&apos;informatique et des
          libertés (CNIL) — cnil.fr — si vous estimez que vos droits ne sont pas respectés.
        </p>
      </section>
    </LegalLayout>
    </PhoneFrame>
  );
}
