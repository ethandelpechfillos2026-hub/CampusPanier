import { AID_RESOURCES } from "@/lib/types";

export default function AidResourcesBanner() {
  return (
    <aside className="rounded-2xl border border-campus-sage/30 bg-campus-sage/10 p-4">
      <h3 className="font-semibold text-campus-ink">
        Des ressources existent sur ton campus
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-campus-muted">
        Avec un budget serré, faire ses courses peut être compliqué — ce n&apos;est
        pas une fatalité. Plusieurs associations proposent de l&apos;aide
        alimentaire aux étudiant·es, sans condition de jugement.
      </p>
      <ul className="mt-4 space-y-3">
        {AID_RESOURCES.map((resource) => (
          <li key={resource.name}>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-white/80 px-3 py-2 transition-colors hover:bg-white"
            >
              <span className="font-medium text-campus-sageDark">
                {resource.name} →
              </span>
              <span className="mt-0.5 block text-sm text-campus-muted">
                {resource.description}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
