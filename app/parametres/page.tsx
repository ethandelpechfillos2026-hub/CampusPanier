"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteUser, onAuthStateChanged, signOut, type User } from "firebase/auth";
import { deleteCloudProfile, getCloudProfile } from "@/lib/authProfile";
import { auth } from "@/lib/firebase";
import { leaveAllSharedLists, setActiveSharedListId } from "@/lib/sharedList";
import { useTheme } from "@/components/ThemeProvider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/locale";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Theme } from "@/lib/types";
import PhoneFrame from "@/components/PhoneFrame";

// Toutes les clés localStorage utilisées par l'application (voir
// lib/favorites.ts, lib/stats.ts, lib/sharedList.ts, lib/achievements.ts) —
// effacées lors de la suppression de compte pour un effacement complet côté
// appareil, même celles issues de code aujourd'hui inutilisé. Le thème et la
// langue (voir lib/i18n/) sont volontairement exclus : ce sont des
// préférences d'affichage de l'appareil, pas des données personnelles au
// sens RGPD, elles n'ont pas de raison de disparaître avec le compte.
const LOCAL_STORAGE_KEYS = [
  "campus-panier-favorites",
  "campus-panier-list-history",
  "campus-panier-recipes-viewed",
  "campus-panier-lists-completed",
  "campus-panier-shared-list-id",
  "campus-panier-achievements-seen",
  "campus-panier-profile",
  "campus-panier-preferences",
];

const HISTORY_STORAGE_KEY = "campus-panier-list-history";

function clearLocalData() {
  LOCAL_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

const CONFIRM_WORD = "SUPPRIMER";

const THEME_OPTIONS: Theme[] = ["light", "dark", "system"];

export default function ParametresPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const themeLabels: Record<Theme, string> = {
    light: t("settings.themeLight"),
    dark: t("settings.themeDark"),
    system: t("settings.themeSystem"),
  };

  function handleClearHistory() {
    if (!window.confirm(t("settings.clearHistoryConfirm"))) return;
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    setHistoryMessage(t("settings.clearHistoryDone"));
  }

  // Export RGPD (article 20, droit à la portabilité) : profil Firestore (si
  // connecté·e) + tout ce qui est propre à cet appareil (favoris,
  // historique, préférences) dans un seul fichier JSON téléchargé
  // localement — aucune donnée n'est envoyée où que ce soit pour cet export.
  async function handleExportData() {
    const cloudProfile = user ? await getCloudProfile(user.uid).catch(() => null) : null;
    const localData: Record<string, unknown> = {};
    for (const key of LOCAL_STORAGE_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (raw === null) continue;
      try {
        localData[key] = JSON.parse(raw);
      } catch {
        localData[key] = raw;
      }
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      account: user ? { email: user.email, uid: user.uid } : null,
      profile: cloudProfile,
      localData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campuspanier-donnees.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCloudProfile(user.uid);
      await leaveAllSharedLists(user.uid);
      setActiveSharedListId(null);
      clearLocalData();
      await deleteUser(user);
      router.push("/");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        setNeedsReauth(true);
        setError(t("settings.deleteAccountReauthMessage"));
      } else {
        setError(t("settings.deleteAccountGenericError"));
        console.error("[CampusPanier] Erreur suppression de compte:", err);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleReauthSignOut() {
    await signOut(auth);
    router.push("/");
  }

  return (
    <PhoneFrame>
    <div className="flex-1 overflow-y-auto px-5 py-5">
      <div className="space-y-6 pb-8">
        <div>
          <Link href="/" className="text-xs font-semibold text-campus-terracotta underline">
            {t("settings.backToApp")}
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-campus-ink">{t("settings.title")}</h1>
        </div>

        {user && (
          <p className="text-sm text-campus-muted">
            {t("settings.connectedAs", { email: user.email ?? "" })}
          </p>
        )}

        <section className="space-y-3 rounded-2xl border-2 border-campus-sand bg-campus-surface p-4">
          <h2 className="text-sm font-bold text-campus-ink">{t("settings.appearanceTitle")}</h2>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-campus-muted">
              {t("settings.themeLabel")}
            </p>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  className={`btn-shortcut ${theme === option ? "btn-shortcut-active" : ""}`}
                >
                  {themeLabels[option]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-campus-muted">
              {t("settings.languageLabel")}
            </p>
            <LanguageSwitcher />
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border-2 border-campus-sand bg-campus-surface p-4">
          <h2 className="text-sm font-bold text-campus-ink">{t("settings.legalTitle")}</h2>
          <div className="flex flex-col gap-1.5 text-sm">
            <Link href="/mentions-legales" className="font-semibold text-campus-terracotta underline">
              {t("settings.legalMentions")}
            </Link>
            <Link href="/cgu" className="font-semibold text-campus-terracotta underline">
              {t("settings.legalCgu")}
            </Link>
            <Link href="/confidentialite" className="font-semibold text-campus-terracotta underline">
              {t("settings.legalPrivacy")}
            </Link>
            <Link href="/cookies" className="font-semibold text-campus-terracotta underline">
              {t("settings.legalCookies")}
            </Link>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border-2 border-campus-sand bg-campus-surface p-4">
          <h2 className="text-sm font-bold text-campus-ink">{t("settings.dataTitle")}</h2>
          <button type="button" onClick={handleExportData} className="btn-secondary">
            {t("settings.exportDataLabel")}
          </button>
          <p className="text-xs text-campus-muted">{t("settings.exportDataHint")}</p>

          <button type="button" onClick={handleClearHistory} className="btn-secondary">
            {t("settings.clearHistoryLabel")}
          </button>
          {historyMessage && (
            <p className="text-xs font-semibold text-campus-success">{historyMessage}</p>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
          <h2 className="text-sm font-bold text-red-900 dark:text-red-200">
            {t("settings.deleteAccountTitle")}
          </h2>
          <p className="text-xs leading-relaxed text-red-900/80 dark:text-red-200/80">
            {t("settings.deleteAccountWarning")}
          </p>

          {!needsReauth ? (
            <>
              <label className="block text-xs font-semibold text-red-900 dark:text-red-200">
                {t("settings.deleteAccountConfirmLabel", { word: CONFIRM_WORD })}
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-xl border-2 border-red-300 bg-campus-surface px-3 py-2 text-sm dark:border-red-900"
                placeholder={CONFIRM_WORD}
              />
              <button
                type="button"
                disabled={confirmText !== CONFIRM_WORD || deleting || !user}
                onClick={handleDeleteAccount}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? t("settings.deleteAccountInProgress") : t("settings.deleteAccountButton")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleReauthSignOut}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              {t("settings.reauthSignOutButton")}
            </button>
          )}

          {error && <p className="text-xs font-semibold text-red-700 dark:text-red-400">{error}</p>}
        </section>
      </div>
    </div>
    </PhoneFrame>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  return (
    <div className="flex gap-2">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setLanguage(locale)}
          className={`btn-shortcut ${language === locale ? "btn-shortcut-active" : ""}`}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
