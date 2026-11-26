"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Nav link that is highlighted on its own page (the dashboard also covers /trends/*). */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const active = href === "/" ? pathname === "/" || pathname.startsWith("/trends") : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}
    >
      {children}
    </Link>
  );
}
