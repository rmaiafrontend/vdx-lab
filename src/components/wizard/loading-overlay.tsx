"use client";

import { Loader2 } from "lucide-react";

type Props = {
  visible: boolean;
};

export function LoadingOverlay({ visible }: Props) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end p-3">
      <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card/90 px-2 py-1 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur">
        <Loader2 className="size-3 animate-spin" />
        atualizando…
      </div>
    </div>
  );
}
