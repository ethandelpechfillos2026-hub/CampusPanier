import LegalLayout from "@/components/LegalLayout";
import { LawyerCheck } from "@/components/LegalPlaceholder";
import PhoneFrame from "@/components/PhoneFrame";

export default function CookiesPage() {
  return (
    <PhoneFrame>
    <LegalLayout title="Cookies et traceurs" updated="8 août 2026">
      <section>
        <p>
          Cette page liste, sans exception, tous les cookies et traceurs utilisés par CampusPanier à ce jour — pas
          plus, pas moins que ce qui existe réellement dans le code de l&apos;application.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">Ce que CampusPanier n&apos;utilise pas</h2>
        <p className="mt-2">
          Aucun cookie ou traceur publicitaire, aucun outil d&apos;analyse d&apos;audience (Google Analytics ou
          équivalent), aucun réseau social intégré. Le code de l&apos;application ne contient aucune dépendance de ce
          type.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">Ce que CampusPanier utilise, et pourquoi</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>Connexion Google (accounts.google.com)</strong> — le bouton de connexion est fourni par un
            script chargé depuis les serveurs de Google (Google Identity Services), nécessaire pour authentifier le
            compte. Ce script peut déposer un traceur technique de sécurité côté Google, en dehors du contrôle direct
            de CampusPanier.
          </li>
          <li>
            <strong>Session Firebase Authentication</strong> — un identifiant de session est conservé sur
            l&apos;appareil (stockage du navigateur) pour garder l&apos;utilisateur·rice connecté·e d&apos;une visite
            à l&apos;autre, sans avoir à se reconnecter à chaque fois.
          </li>
          <li>
            <strong>Stockage local de confort</strong> (favoris, historique des listes, recettes déjà vues,
            préférences non connectées) — conservé uniquement sur l&apos;appareil, jamais transmis à un serveur,
            pour faire fonctionner l&apos;application (mémoriser un choix, éviter de tout ressaisir).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">Consentement</h2>
        <p className="mt-2">
          Ces traceurs sont tous strictement nécessaires au fonctionnement du service demandé par
          l&apos;utilisateur·rice (se connecter, rester connecté·e, retrouver ses préférences) — aucun bandeau de
          consentement cookies n&apos;est donc affiché, conformément aux exemptions prévues par les recommandations
          de la CNIL pour les traceurs strictement nécessaires au service.{" "}
          <LawyerCheck>
            confirmer que cette qualification (traceurs exemptés de consentement) s&apos;applique bien à l&apos;usage
            précis fait ici du script Google Identity Services, avant de s&apos;appuyer publiquement sur cette
            exemption
          </LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">Gestion</h2>
        <p className="mt-2">
          Vous pouvez à tout moment supprimer les données stockées localement en effaçant les données de
          navigation de votre navigateur pour ce site, ou en vous déconnectant puis en supprimant votre compte
          depuis{" "}
          <a href="/parametres" className="font-semibold text-campus-terracotta underline">
            Réglages
          </a>
          .
        </p>
      </section>
    </LegalLayout>
    </PhoneFrame>
  );
}
