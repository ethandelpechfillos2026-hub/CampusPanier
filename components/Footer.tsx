"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";

// Pied de page légal, affiché sur tout l'écran (voir PhoneFrame.tsx) — accès
// permanent aux documents légaux depuis n'importe quel endroit de l'app,
// comme demandé dans le pack juridique.
export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-campus-sand/80 px-5 py-3 text-center text-[11px] text-campus-muted">
      <Link href="/mentions-legales" className="underline hover:text-campus-terracotta">
        {t("footer.legalMentions")}
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/cgu" className="underline hover:text-campus-terracotta">
        {t("footer.terms")}
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/confidentialite" className="underline hover:text-campus-terracotta">
        {t("footer.privacy")}
      </Link>
      <span aria-hidden="true">·</span>
      <Link href="/cookies" className="underline hover:text-campus-terracotta">
        {t("footer.cookies")}
      </Link>
    </footer>
  );
}
