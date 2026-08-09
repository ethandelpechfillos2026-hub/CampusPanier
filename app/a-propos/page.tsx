"use client";

import Link from "next/link";
import PhoneFrame from "@/components/PhoneFrame";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function AProposPage() {
  const { t } = useTranslation();
  return (
    <PhoneFrame>
    <div className="flex-1 overflow-y-auto space-y-6 px-5 py-5">
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">{t("aPropos.title")}</h1>
        <p className="mt-1 text-campus-muted">
          {t("aPropos.subtitle")}
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border-2 border-campus-sand bg-campus-surface p-4">
        <h2 className="text-lg font-semibold">{t("aPropos.whyTitle")}</h2>
        <p className="leading-relaxed text-campus-muted">
          {t("aPropos.whyP1")}
        </p>
        <p className="leading-relaxed text-campus-muted">
          {t("aPropos.whyP2")}
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-campus-sand bg-campus-surface p-4">
        <h2 className="text-lg font-semibold">{t("aPropos.howTitle")}</h2>
        <ol className="list-inside list-decimal space-y-2 text-campus-muted">
          <li>{t("aPropos.howStep1")}</li>
          <li>{t("aPropos.howStep2")}</li>
          <li>{t("aPropos.howStep3")}</li>
        </ol>
        <p className="text-sm text-campus-muted">
          {t("aPropos.pricesNote")}
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border-2 border-campus-sand bg-campus-surface p-4">
        <h2 className="text-lg font-semibold">{t("aPropos.pilotTitle")}</h2>
        <p className="leading-relaxed text-campus-muted">
          {t("aPropos.pilotText")}
        </p>
      </section>

      <Link href="/" className="btn-primary inline-flex">
        {t("aPropos.createListButton")}
      </Link>
    </div>
    </PhoneFrame>
  );
}
