"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

export default function SignIn() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError(t("signIn.missingGoogleConfig"));
      return;
    }

    async function handleCredentialResponse(response: { credential: string }) {
      setError(null);
      try {
        const credential = GoogleAuthProvider.credential(response.credential);
        await signInWithCredential(auth, credential);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code ?? "inconnu";
        setError(t("signIn.connectionError", { code }));
        console.error("[CampusPanier] Erreur signInWithCredential:", err);
      }
    }

    function initGoogle() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID as string,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_black",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 280,
      });
    }

    if (window.google) {
      initGoogle();
      return;
    }

    const existingScript = document.getElementById("google-identity-script");
    if (existingScript) {
      existingScript.addEventListener("load", initGoogle);
      return () => existingScript.removeEventListener("load", initGoogle);
    }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-campus-terracotta text-3xl text-white">
        🛒
      </span>
      <div>
        <h1 className="text-2xl font-bold text-campus-ink">{t("signIn.welcome")}</h1>
        <p className="mt-2 text-sm text-campus-muted">
          {t("signIn.subtitle")}
        </p>
      </div>
      <div ref={buttonRef} />
      <p className="max-w-xs text-xs text-campus-muted">
        {t("signIn.disclaimerPart1")}{" "}
        <Link href="/cgu" className="font-semibold text-campus-terracotta underline">
          {t("signIn.termsLink")}
        </Link>{" "}
        {t("signIn.andOur")}{" "}
        <Link
          href="/confidentialite"
          className="font-semibold text-campus-terracotta underline"
        >
          {t("common.privacyPolicyLink")}
        </Link>
        {t("signIn.disclaimerPart2")}
      </p>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
