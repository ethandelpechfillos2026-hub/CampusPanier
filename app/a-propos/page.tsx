import Link from "next/link";

export default function AProposPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">À propos</h1>
        <p className="mt-1 text-campus-muted">
          Le concept derrière CampusPanier
        </p>
      </div>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Pourquoi CampusPanier ?</h2>
        <p className="leading-relaxed text-campus-muted">
          Faire ses courses en étant étudiant·e, c&apos;est jongler entre un
          budget serré, des contraintes alimentaires et peu de temps. CampusPanier
          t&apos;aide à construire une liste de courses réaliste en quelques
          clics — sans prise de tête, sans jugement.
        </p>
        <p className="leading-relaxed text-campus-muted">
          L&apos;application génère une sélection de produits adaptée à ton
          budget hebdomadaire, ton type d&apos;alimentation, tes allergies et
          tes préférences personnelles.
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Comment ça marche ?</h2>
        <ol className="list-inside list-decimal space-y-2 text-campus-muted">
          <li>Tu indiques ton budget et tes contraintes alimentaires.</li>
          <li>L&apos;app filtre un catalogue de produits et compose ton panier.</li>
          <li>Tu obtiens une liste prête à emporter au supermarché.</li>
        </ol>
        <p className="text-sm text-campus-muted">
          Les prix affichés sont des données mockées à titre indicatif. Ils
          seront remplacés par une source fiable lors de la prochaine étape du
          projet.
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Pilote rentrée 2026</h2>
        <p className="leading-relaxed text-campus-muted">
          CampusPanier est testé en conditions réelles sur 1 à 2 campus français
          à la rentrée 2026. Ton retour nous aidera à améliorer l&apos;outil
          avant un déploiement plus large.
        </p>
      </section>

      <Link href="/" className="btn-primary inline-flex">
        Créer ma liste de courses
      </Link>
    </div>
  );
}
