"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_NAV } from "./docs-nav-data";

type Props = {
  /** Callback opcional disparado quando um link é clicado (usado pelo drawer mobile). */
  onNavigate?: () => void;
};

export function DocsSidebar({ onNavigate }: Props) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6">
      {DOCS_NAV.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.pages.map((page) => {
              const active = pathname === page.href;
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    onClick={onNavigate}
                    className={`relative block rounded-md px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-muted/40 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1.5 h-5 w-0.5 rounded-r bg-primary"
                        aria-hidden
                      />
                    )}
                    {page.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
