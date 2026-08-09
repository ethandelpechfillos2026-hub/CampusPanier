import type { Config } from "tailwindcss";

// Couleurs exprimées via des variables CSS (voir app/globals.css, blocs
// :root et .dark) plutôt que des valeurs hexadécimales fixes — c'est ce qui
// permet au mode sombre de changer les couleurs SANS toucher aux 300+
// usages de classes `campus-*` déjà répartis dans toute l'app : chaque
// composant garde `text-campus-ink`/`border-campus-sand`/etc. tel quel, et
// c'est la valeur de la variable CSS qui change selon que `.dark` est
// présent sur `<html>` ou non (voir components/ThemeProvider.tsx).
// Le format `rgb(var(--x) / <alpha-value>)` est nécessaire pour que les
// modificateurs d'opacité Tailwind (`bg-campus-terracotta/10`, très utilisés
// dans l'app) continuent de fonctionner avec des variables CSS.
function withOpacity(variableName: string) {
  return `rgb(var(${variableName}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          cream: withOpacity("--campus-cream"),
          sand: withOpacity("--campus-sand"),
          terracotta: withOpacity("--campus-terracotta"),
          terracottaDark: withOpacity("--campus-terracotta-dark"),
          sage: withOpacity("--campus-sage"),
          sageDark: withOpacity("--campus-sage-dark"),
          success: withOpacity("--campus-success"),
          danger: withOpacity("--campus-danger"),
          ink: withOpacity("--campus-ink"),
          muted: withOpacity("--campus-muted"),
          // Fond "carte" (remplace bg-white en dur) et fond "subtil"
          // secondaire — ajoutés pour le mode sombre : un simple bg-white
          // ne peut pas s'adapter au thème, ces deux tokens le peuvent.
          surface: withOpacity("--campus-surface"),
          surface2: withOpacity("--campus-surface-2"),
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
