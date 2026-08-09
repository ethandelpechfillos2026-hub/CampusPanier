"use client";

import LegalLayout from "@/components/LegalLayout";
import { DecisionNeeded, LawyerCheck, Placeholder } from "@/components/LegalPlaceholder";
import PhoneFrame from "@/components/PhoneFrame";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function CguPage() {
  const { t } = useTranslation();
  return (
    <PhoneFrame>
    <LegalLayout title={t("legalCgu.title")} updated="8 août 2026">
      <section>
        <p className="italic text-campus-muted">
          {t("legalCgu.intro")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s1Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s1P1Pre")}{" "}
          <Placeholder>{t("legalCgu.s1Ph1")}</Placeholder>.{t("legalCgu.s1P1Post")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s2Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s2P1")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s3Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s3P1")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s4Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s4P1")}
        </p>
        <p className="mt-2">
          <DecisionNeeded>{t("legalCgu.s4Decision1")}</DecisionNeeded>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s5Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s5P1")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s6Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s6P1")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s7Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s7P1")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s8Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s8P1Pre")}{" "}
          <LawyerCheck>{t("legalCgu.s8Lawyer1")}</LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s9Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s9P1")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s10Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s10P1Pre")}{" "}
          <a href="/parametres" className="font-semibold text-campus-terracotta underline">
            {t("app.settings")}
          </a>
          {t("legalCgu.s10P1Post")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCgu.s11Title")}</h2>
        <p className="mt-2">
          {t("legalCgu.s11P1Pre")}{" "}
          <Placeholder>{t("legalCgu.s11Ph1")}</Placeholder>
          .
        </p>
      </section>
    </LegalLayout>
    </PhoneFrame>
  );
}
