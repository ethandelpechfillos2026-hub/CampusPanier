import LegalLayout from "@/components/LegalLayout";
import { LawyerCheck, Placeholder } from "@/components/LegalPlaceholder";
import PhoneFrame from "@/components/PhoneFrame";

export default function MentionsLegalesPage() {
  return (
    <PhoneFrame>
    <LegalLayout title="Mentions légales" updated="8 août 2026">
      <section>
        <h2 className="text-base font-bold text-campus-ink">Éditeur du site</h2>
        <p className="mt-2">
          CampusPanier est édité par <Placeholder>nom et prénom, ou dénomination sociale</Placeholder>,{" "}
          <Placeholder>statut : personne physique / auto-entrepreneur / société — préciser la forme juridique</Placeholder>,{" "}
          <Placeholder>numéro SIREN/SIRET si applicable</Placeholder>, domicilié·e ou immatriculé·e au{" "}
          <Placeholder>adresse postale complète</Placeholder>.
        </p>
        <p className="mt-2">
          Adresse e-mail de contact : <Placeholder>adresse e-mail de contact publique</Placeholder>.
        </p>
        <p className="mt-2">
          Numéro de téléphone : <Placeholder>facultatif — numéro de contact, ou indiquer &quot;non communiqué&quot;</Placeholder>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">Directeur·rice de la publication</h2>
        <p className="mt-2">
          <Placeholder>nom et prénom du/de la responsable de la publication — en général l&apos;éditeur lui-même/elle-même pour un particulier</Placeholder>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">Hébergement</h2>
        <p className="mt-2">
          L&apos;application est hébergée par Vercel Inc. Adresse et coordonnées à vérifier au moment de la
          publication sur la page légale officielle de Vercel (vercel.com/legal), car elles peuvent changer :{" "}
          <Placeholder>adresse actuelle de Vercel Inc. à copier depuis vercel.com/legal</Placeholder>.
        </p>
        <p className="mt-2">
          Les données de compte et de profil (voir la{" "}
          <a href="/confidentialite" className="font-semibold text-campus-terracotta underline">
            politique de confidentialité
          </a>
          ) sont stockées via Google Firebase / Firestore. Éditeur : Google Ireland Limited ou Google LLC selon la
          région du projet Firebase —{" "}
          <LawyerCheck>
            confirmer l&apos;entité Google exacte applicable (Ireland vs. LLC) et sa localisation de données via la
            console Firebase du projet avant publication
          </LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">Propriété intellectuelle</h2>
        <p className="mt-2">
          La structure du site, son design, ses textes, son code et les éléments qui le composent sont, sauf mention
          contraire, la propriété de l&apos;éditeur ou de ses partenaires. Toute reproduction non autorisée est
          susceptible de constituer une contrefaçon. Le catalogue de produits (noms, prix, correspondances) est
          construit à partir de données publiques d&apos;Open Food Facts et Open Prices, sous licence Open Database
          License (ODbL) — <LawyerCheck>confirmer que l&apos;attribution ODbL actuellement affichée (ou absente) respecte les conditions de cette licence</LawyerCheck>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">Nature du service</h2>
        <p className="mt-2">
          CampusPanier est un outil informatif d&apos;aide à la composition de listes de courses selon un budget et
          des préférences alimentaires déclarées. Il ne constitue ni un avis médical, ni un plan nutritionnel établi
          par un professionnel de santé. Les repères caloriques et de macronutriments affichés sont des estimations
          génériques, pas une prescription individualisée.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">Contact</h2>
        <p className="mt-2">
          Pour toute question relative au site ou à ces mentions légales :{" "}
          <Placeholder>adresse e-mail de contact</Placeholder>.
        </p>
      </section>
    </LegalLayout>
    </PhoneFrame>
  );
}
