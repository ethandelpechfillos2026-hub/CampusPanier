import LegalLayout from "@/components/LegalLayout";
import { DecisionNeeded, LawyerCheck, Placeholder } from "@/components/LegalPlaceholder";
import PhoneFrame from "@/components/PhoneFrame";

export default function CguPage() {
  return (
    <PhoneFrame>
    <LegalLayout title="Conditions générales d'utilisation" updated="8 août 2026">
      <section>
        <p className="italic text-campus-muted">
          Version applicable à la bêta gratuite actuelle de CampusPanier. Aucun paiement n&apos;est demandé à ce
          stade — une version distincte (conditions générales de vente) sera publiée séparément avant
          l&apos;activation d&apos;un éventuel abonnement payant.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">1. Objet</h2>
        <p className="mt-2">
          Les présentes conditions générales d&apos;utilisation (CGU) régissent l&apos;accès et l&apos;usage de
          l&apos;application CampusPanier (ci-après &quot;l&apos;Application&quot;), éditée par{" "}
          <Placeholder>identité de l&apos;éditeur — voir mentions légales</Placeholder>. L&apos;Application aide à
          générer une liste de courses adaptée à un budget et à des préférences alimentaires déclarées par
          l&apos;utilisateur·rice.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">2. Nature du service et absence de garantie</h2>
        <p className="mt-2">
          L&apos;Application est un outil informatif d&apos;aide à la décision. Elle ne fournit ni conseil médical,
          ni avis diététique personnalisé établi par un professionnel de santé. Les repères caloriques, de
          macronutriments et les prix affichés sont des estimations, susceptibles d&apos;écart avec la réalité (voir
          la mention de fiabilité affichée sous chaque prix dans l&apos;Application). L&apos;utilisateur·rice reste
          seul·e responsable de ses choix alimentaires et d&apos;achat.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">3. Accès au service, bêta gratuite</h2>
        <p className="mt-2">
          L&apos;Application est actuellement fournie gratuitement, en version bêta. Cela signifie que des
          fonctionnalités peuvent évoluer, être ajoutées, modifiées ou retirées sans préavis, et que
          l&apos;Application peut connaître des interruptions ou des anomalies. Aucune disponibilité continue
          (&quot;uptime&quot;) n&apos;est garantie à ce stade.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">4. Création de compte</h2>
        <p className="mt-2">
          L&apos;accès aux fonctionnalités nécessitant la sauvegarde d&apos;un profil (préférences, historique)
          requiert une connexion via un compte Google. L&apos;utilisateur·rice s&apos;engage à fournir des
          informations exactes et à ne pas usurper l&apos;identité d&apos;un tiers.
        </p>
        <p className="mt-2">
          <DecisionNeeded>
            âge minimum d&apos;utilisation — l&apos;Application ne vérifie actuellement pas l&apos;âge des
            utilisateur·rices ; décider d&apos;un âge minimum (ex. 15 ans, cohérent avec le public étudiant visé) et
            l&apos;indiquer explicitement ici
          </DecisionNeeded>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">5. Obligations de l&apos;utilisateur·rice</h2>
        <p className="mt-2">
          L&apos;utilisateur·rice s&apos;engage à utiliser l&apos;Application conformément à sa destination, à ne pas
          tenter d&apos;en perturber le fonctionnement (intrusion, extraction massive de données, ingénierie
          inverse) et à respecter les autres utilisateur·rices, notamment dans le cadre de la fonctionnalité de
          liste partagée entre colocataires.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">6. Liste partagée entre colocataires</h2>
        <p className="mt-2">
          La fonctionnalité de liste partagée permet à plusieurs comptes de rejoindre une même liste via un code
          d&apos;invitation. Les articles cochés sont visibles par tous les membres, ainsi que le nom (ou nom Google)
          de la personne qui a coché chaque article. Toute personne disposant du code d&apos;invitation peut
          rejoindre la liste — à ne partager qu&apos;avec des personnes de confiance.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">7. Propriété intellectuelle</h2>
        <p className="mt-2">
          L&apos;Application, son code, son design et ses contenus sont protégés par le droit de la propriété
          intellectuelle. L&apos;utilisateur·rice ne dispose que d&apos;un droit d&apos;usage personnel, non exclusif
          et non transférable.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">8. Responsabilité</h2>
        <p className="mt-2">
          Dans les limites permises par la loi, l&apos;éditeur ne saurait être tenu responsable des dommages
          résultant de l&apos;usage ou de l&apos;impossibilité d&apos;usage de l&apos;Application, d&apos;une erreur
          dans un prix affiché, d&apos;une incompatibilité alimentaire non détectée (allergies, régime) ou de tout
          choix d&apos;achat ou alimentaire fait sur la base des informations fournies par l&apos;Application.{" "}
          <LawyerCheck>
            vérifier la formulation de cette clause de limitation de responsabilité au regard du droit de la
            consommation français, notamment sur les clauses abusives interdites face à un public de consommateurs
          </LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">9. Modification des CGU</h2>
        <p className="mt-2">
          Ces CGU peuvent être modifiées à tout moment, notamment pour accompagner l&apos;évolution de
          l&apos;Application. La version en vigueur est celle publiée sur cette page, avec sa date de mise à jour.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">10. Résiliation</h2>
        <p className="mt-2">
          L&apos;utilisateur·rice peut cesser d&apos;utiliser l&apos;Application et supprimer son compte à tout
          moment depuis l&apos;écran{" "}
          <a href="/parametres" className="font-semibold text-campus-terracotta underline">
            Réglages
          </a>
          . L&apos;éditeur se réserve le droit de suspendre l&apos;accès d&apos;un compte en cas d&apos;usage
          contraire aux présentes CGU.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">11. Droit applicable</h2>
        <p className="mt-2">
          Les présentes CGU sont soumises au droit français. En cas de litige,{" "}
          <Placeholder>
            juridiction compétente ou mode de résolution amiable préalable à préciser
          </Placeholder>
          .
        </p>
      </section>
    </LegalLayout>
    </PhoneFrame>
  );
}
