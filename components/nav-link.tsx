"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Nav pill that is highlighted on its own page (the dashboard also covers /trends/*). */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const active = href === "/" ? pathname === "/" || pathname.startsWith("/trends") : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${
        active
          ? "bg-secondary font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
