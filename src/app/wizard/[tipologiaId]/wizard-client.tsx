"use client";

import { Suspense } from "react";
import type { TipologiaSnapshot } from "@/lib/engine";
import { WizardShell } from "@/components/wizard/wizard-shell";

type Props = {
  snapshot: TipologiaSnapshot;
  categoria: string;
  isDinamica: boolean;
};

export function WizardClient({ snapshot, categoria, isDinamica }: Props) {
  return (
    <Suspense fallback={null}>
      <WizardShell
        snapshot={snapshot}
        categoria={categoria}
        isDinamica={isDinamica}
      />
    </Suspense>
  );
}
