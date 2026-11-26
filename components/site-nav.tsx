import Link from "next/link";

export const NAV_LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/calendar", label: "Calendar" },
  { href: "/metrics", label: "Metrics" },
] as const;

export function SiteNav() {
  return (
    <header className="border-b">
      <nav
        aria-label="Main"
        className="mx-auto flex w-full max-w-5xl items-center gap-6 px-4 py-3"
      >
        <Link href="/" className="font-semibold tracking-tight">
          TrendPilot
        </Link>
        <ul className="flex gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
