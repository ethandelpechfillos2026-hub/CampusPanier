import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

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
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
          <Header />
          <main className="flex-1 px-4 pb-8 pt-2">{children}</main>
        </div>
      </body>
    </html>
  );
}
