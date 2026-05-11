"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Admin" },
  { href: "/wizard", label: "Wizard" },
  { href: "/docs", label: "Docs" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`relative rounded-md px-3 py-1.5 transition-colors ${
              active
                ? "bg-muted/40 font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
            }`}
          >
            {l.label}
            {active && (
              <span
                className="absolute inset-x-3 -bottom-px h-px bg-primary"
                aria-hidden
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
