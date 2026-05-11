"use client";

import { ChevronRight, SlidersHorizontal } from "lucide-react";

type Props = {
  count: number;
  children: React.ReactNode;
};

export function AdvancedSection({ count, children }: Props) {
  if (count === 0) return null;
  return (
    <details className="group rounded-xl border border-border/60 bg-card/30 [&[open]>summary]:border-b-border/40 [&[open]>summary]:border-b">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <SlidersHorizontal className="size-4 shrink-0" />
        <span className="flex-1">Avançado</span>
        <span className="rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {count}
        </span>
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="space-y-2 p-4">{children}</div>
    </details>
  );
}
