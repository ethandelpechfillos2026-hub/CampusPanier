import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import Providers from "@/components/Providers";
import "./globals.css";

// Applique la classe `dark` sur <html> avant même l'hydratation React — sans
// ça, la page s'affiche toujours en clair une fraction de seconde avant que
// ThemeProvider (components/ThemeProvider.tsx) ne prenne le relais, ce qui
// crée un flash clair->sombre désagréable pour qui a choisi le mode sombre.
// Contenu 100% statique (pas d'entrée utilisateur) : sûr avec
// dangerouslySetInnerHTML.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("campus-panier-theme");
    var isDark =
      stored === "dark" ||
      (stored !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CampusPanier — Courses adaptées à ton budget",
  description:
    "Génère une liste de courses adaptée à ton budget, ton régime alimentaire et tes allergies. Pensé pour les étudiants.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CampusPanier",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#E07A5F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
