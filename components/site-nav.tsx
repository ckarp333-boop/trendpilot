import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ChartNoAxesColumn, LayoutDashboard, Store, TrendingUp } from "lucide-react";
import { NavLink } from "./nav-link";
import { ProfileChip } from "./profile-chip";

export const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: Store },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/metrics", label: "Metrics", icon: ChartNoAxesColumn },
] as const;

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.62_0.15_60)] text-primary-foreground shadow-sm"
      >
        <TrendingUp className="size-4.5" strokeWidth={2.5} />
      </span>
      <span>TrendPilot</span>
    </Link>
  );
}

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <nav aria-label="Main" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-1">
          <Logo />
          <ul className="flex items-center gap-1 text-sm">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                {/* usePathname() is runtime data: render a plain link until it streams in. */}
                <Suspense
                  fallback={
                    <Link
                      href={href}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-muted-foreground"
                    >
                      <Icon aria-hidden className="hidden size-4 sm:block" />
                      {label}
                    </Link>
                  }
                >
                  <NavLink href={href}>
                    <Icon aria-hidden className="hidden size-4 sm:block" />
                    {label}
                  </NavLink>
                </Suspense>
              </li>
            ))}
          </ul>
        </nav>
        <ProfileChip />
      </div>
    </header>
  );
}
