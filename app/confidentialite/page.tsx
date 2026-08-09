"use client";

import LegalLayout from "@/components/LegalLayout";
import { DecisionNeeded, LawyerCheck, Placeholder } from "@/components/LegalPlaceholder";
import PhoneFrame from "@/components/PhoneFrame";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function ConfidentialitePage() {
  const { t } = useTranslation();
  return (
    <PhoneFrame>
    <LegalLayout title={t("legalPrivacy.title")} updated="8 août 2026">
      <section>
        <p className="italic text-campus-muted">
          {t("legalPrivacy.intro")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s1Title")}</h2>
        <p className="mt-2">
          <Placeholder>{t("legalPrivacy.s1Ph1")}</Placeholder>{t("legalPrivacy.s1Mid")}{" "}
          <Placeholder>{t("legalPrivacy.s1Ph2")}</Placeholder>.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s2Title")}</h2>

        <p className="mt-3 font-semibold">{t("legalPrivacy.s2aTitle")}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>{t("legalPrivacy.s2aItem1")}</li>
        </ul>

        <p className="mt-3 font-semibold">{t("legalPrivacy.s2bTitle")}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>{t("legalPrivacy.s2bItem1")}</li>
          <li>{t("legalPrivacy.s2bItem2")}</li>
          <li>{t("legalPrivacy.s2bItem3")}</li>
          <li>{t("legalPrivacy.s2bItem4")}</li>
          <li>{t("legalPrivacy.s2bItem5")}</li>
          <li>{t("legalPrivacy.s2bItem6")}</li>
          <li>{t("legalPrivacy.s2bItem7")}</li>
          <li>{t("legalPrivacy.s2bItem8")}</li>
        </ul>

        <p className="mt-3 font-semibold">{t("legalPrivacy.s2cTitle")}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>{t("legalPrivacy.s2cItem1")}</li>
          <li>{t("legalPrivacy.s2cItem2")}</li>
          <li>{t("legalPrivacy.s2cItem3")}</li>
        </ul>

        <p className="mt-3 font-semibold">{t("legalPrivacy.s2dTitle")}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>{t("legalPrivacy.s2dItem1")}</li>
        </ul>

        <p className="mt-3 text-xs text-campus-muted">
          {t("legalPrivacy.s2note")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s3Title")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t("legalPrivacy.s3Item1")}</li>
          <li>{t("legalPrivacy.s3Item2")}</li>
          <li>{t("legalPrivacy.s3Item3")}</li>
          <li>{t("legalPrivacy.s3Item4")}</li>
        </ul>
        <p className="mt-2">
          {t("legalPrivacy.s3P2")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s4Title")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>{t("legalPrivacy.s4Item1Title")}</strong> {t("legalPrivacy.s4Item1Text")}
          </li>
          <li>
            <strong>{t("legalPrivacy.s4Item2Title")}</strong> {t("legalPrivacy.s4Item2TextPre")}{" "}
            <LawyerCheck>{t("legalPrivacy.s4Item2Lawyer")}</LawyerCheck>
            .
          </li>
          <li>
            <strong>{t("legalPrivacy.s4Item3Title")}</strong> {t("legalPrivacy.s4Item3Text")}
          </li>
          <li>
            <strong>{t("legalPrivacy.s4Item4Title")}</strong> {t("legalPrivacy.s4Item4Text")}
          </li>
        </ul>
        <p className="mt-2">
          {t("legalPrivacy.s4P2")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s5Title")}</h2>
        <p className="mt-2">
          {t("legalPrivacy.s5P1Pre")}{" "}
          <LawyerCheck>{t("legalPrivacy.s5Lawyer1")}</LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s6Title")}</h2>
        <p className="mt-2">
          {t("legalPrivacy.s6P1")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s7Title")}</h2>
        <p className="mt-2">
          <DecisionNeeded>{t("legalPrivacy.s7Decision1")}</DecisionNeeded>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s8Title")}</h2>
        <p className="mt-2">
          {t("legalPrivacy.s8P1")}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>{t("legalPrivacy.s8Item1Title")}</strong> {t("legalPrivacy.s8Item1Text")}
          </li>
          <li>
            <strong>{t("legalPrivacy.s8Item2Title")}</strong> {t("legalPrivacy.s8Item2TextPre")}{" "}
            <DecisionNeeded>{t("legalPrivacy.s8Item2Decision")}</DecisionNeeded>
            .
          </li>
          <li>
            <strong>{t("legalPrivacy.s8Item3Title")}</strong> {t("legalPrivacy.s8Item3TextPre")}{" "}
            <a href="/parametres" className="font-semibold text-campus-terracotta underline">
              {t("legalPrivacy.s8Item3LinkText")}
            </a>
            {t("legalPrivacy.s8Item3TextPost")}
          </li>
          <li>
            {t("legalPrivacy.s8Item4Pre")}{" "}
            <Placeholder>{t("legalPrivacy.s8Item4Ph")}</Placeholder>.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s9Title")}</h2>
        <p className="mt-2">
          {t("legalPrivacy.s9P1")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s10Title")}</h2>
        <p className="mt-2">
          {t("legalPrivacy.s10P1Pre")}{" "}
          <a href="/cookies" className="font-semibold text-campus-terracotta underline">
            {t("legalPrivacy.s10LinkText")}
          </a>{" "}
          {t("legalPrivacy.s10P1Post")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s11Title")}</h2>
        <p className="mt-2">
          <DecisionNeeded>{t("legalPrivacy.s11Decision1")}</DecisionNeeded>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s12Title")}</h2>
        <p className="mt-2">
          {t("legalPrivacy.s12P1Pre")}{" "}
          <LawyerCheck>{t("legalPrivacy.s12Lawyer1")}</LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalPrivacy.s13Title")}</h2>
        <p className="mt-2">
          {t("legalPrivacy.s13P1")}
        </p>
      </section>
    </LegalLayout>
    </PhoneFrame>
  );
}
