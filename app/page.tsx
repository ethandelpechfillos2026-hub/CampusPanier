import OnboardingForm from "@/components/OnboardingForm";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-campus-terracotta/10 to-campus-sage/10 p-5">
        <h2 className="text-lg font-semibold text-campus-ink">
          Tes courses, à ton rythme
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-campus-muted">
          Réponds à quelques questions et obtiens une liste de courses adaptée à
          ton budget, ton régime et tes allergies — en quelques secondes.
        </p>
      </section>
      <OnboardingForm />
      <p className="text-center text-xs text-campus-muted">
        Projet pilote rentrée 2026 · Données de prix indicatives
      </p>
    </div>
  );
}
