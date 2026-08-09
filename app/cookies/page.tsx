"use client";

import LegalLayout from "@/components/LegalLayout";
import { LawyerCheck } from "@/components/LegalPlaceholder";
import PhoneFrame from "@/components/PhoneFrame";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function CookiesPage() {
  const { t } = useTranslation();
  return (
    <PhoneFrame>
    <LegalLayout title={t("legalCookies.title")} updated="8 août 2026">
      <section>
        <p>
          {t("legalCookies.intro")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCookies.notUsedTitle")}</h2>
        <p className="mt-2">
          {t("legalCookies.notUsedText")}
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCookies.usedTitle")}</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>{t("legalCookies.usedGoogleTitle")}</strong> {t("legalCookies.usedGoogleText")}
          </li>
          <li>
            <strong>{t("legalCookies.usedFirebaseTitle")}</strong> {t("legalCookies.usedFirebaseText")}
          </li>
          <li>
            <strong>{t("legalCookies.usedLocalTitle")}</strong> {t("legalCookies.usedLocalText")}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCookies.consentTitle")}</h2>
        <p className="mt-2">
          {t("legalCookies.consentP1Pre")}{" "}
          <LawyerCheck>{t("legalCookies.consentLawyer1")}</LawyerCheck>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-campus-ink">{t("legalCookies.manageTitle")}</h2>
        <p className="mt-2">
          {t("legalCookies.manageP1Pre")}{" "}
          <a href="/parametres" className="font-semibold text-campus-terracotta underline">
            {t("app.settings")}
          </a>
          .
        </p>
      </section>
    </LegalLayout>
    </PhoneFrame>
  );
}
