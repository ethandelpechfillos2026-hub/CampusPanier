import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-campus-sand/80 bg-campus-cream/95 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-campus-terracotta text-lg text-white">
            🛒
          </span>
          <span className="text-lg font-bold text-campus-ink">CampusPanier</span>
        </Link>
        <Link
          href="/a-propos"
          className="text-sm font-medium text-campus-sageDark hover:text-campus-terracotta"
        >
          À propos
        </Link>
      </div>
    </header>
  );
}
