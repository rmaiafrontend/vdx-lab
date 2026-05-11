import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getPageNav } from "./docs-nav-data";

type Props = {
  href: string;
};

export function PageNav({ href }: Props) {
  const { prev, next } = getPageNav(href);
  if (!prev && !next) return null;
  return (
    <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-border/40 pt-6">
      <div>
        {prev && (
          <Link
            href={prev.href}
            className="group flex flex-col gap-1 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-card/60"
          >
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <ArrowLeft className="size-3" />
              Anterior
            </span>
            <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
              {prev.label}
            </span>
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link
            href={next.href}
            className="group flex flex-col items-end gap-1 rounded-lg border border-border/60 bg-card/40 p-3 text-right transition-colors hover:border-primary/40 hover:bg-card/60"
          >
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Próximo
              <ArrowRight className="size-3" />
            </span>
            <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
              {next.label}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
