"use client";

import LegalLayout from "@/components/LegalLayout";
import { LawyerCheck, Placeholder } from "@/components/LegalPlaceholder";
import PhoneFrame from "@/components/PhoneFrame";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function MentionsLegalesPage() {
  const { t } = useTranslation();
  return (
    <PhoneFrame>
    <LegalLayout title={t("legalMentions.title")} updated="8 août 2026">
      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalMentions.editorTitle")}</h2>
        <p className="mt-2">
          {t("legalMentions.editorP1Pre")} <Placeholder>{t("legalMentions.editorPh1")}</Placeholder>,{" "}
          <Placeholder>{t("legalMentions.editorPh2")}</Placeholder>,{" "}
          <Placeholder>{t("legalMentions.editorPh3")}</Placeholder>{t("legalMentions.editorP1Mid")}{" "}
          <Placeholder>{t("legalMentions.editorPh4")}</Placeholder>{t("legalMentions.editorP1End")}
        </p>
        <p className="mt-2">
          {t("legalMentions.editorEmailPre")} <Placeholder>{t("legalMentions.editorPh5")}</Placeholder>.
        </p>
        <p className="mt-2">
          {t("legalMentions.editorPhonePre")} <Placeholder>{t("legalMentions.editorPh6")}</Placeholder>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalMentions.publisherTitle")}</h2>
        <p className="mt-2">
          <Placeholder>{t("legalMentions.publisherPh")}</Placeholder>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalMentions.hostingTitle")}</h2>
        <p className="mt-2">
          {t("legalMentions.hostingP1Pre")}{" "}
          <Placeholder>{t("legalMentions.hostingPh1")}</Placeholder>.
        </p>
        <p className="mt-2">
          {t("legalMentions.hostingP2Pre")}{" "}
          <a href="/confidentialite" className="font-semibold text-campus-terracotta underline">
            {t("common.privacyPolicyLink")}
          </a>
          {t("legalMentions.hostingP2Mid")}{" "}
          <LawyerCheck>{t("legalMentions.hostingLawyer1")}</LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalMentions.ipTitle")}</h2>
        <p className="mt-2">
          {t("legalMentions.ipP1Pre")}{" "}
          <LawyerCheck>{t("legalMentions.ipLawyer1")}</LawyerCheck>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalMentions.natureTitle")}</h2>
        <p className="mt-2">
          {t("legalMentions.natureP1")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalMentions.contactTitle")}</h2>
        <p className="mt-2">
          {t("legalMentions.contactP1Pre")}{" "}
          <Placeholder>{t("legalMentions.contactPh1")}</Placeholder>.
        </p>
      </section>
    </LegalLayout>
    </PhoneFrame>
  );
}
