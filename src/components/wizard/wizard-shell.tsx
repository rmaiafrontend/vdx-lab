"use client";

import type { TipologiaSnapshot } from "@/lib/engine";
import { WizardShellVao } from "./wizard-shell-vao";
import { WizardShellMedida } from "./wizard-shell-medida";

type Props = {
  snapshot: TipologiaSnapshot;
  categoria: string;
  isDinamica: boolean;
};

export function WizardShell({ snapshot, categoria, isDinamica }: Props) {
  if (snapshot.modo === "VAO") {
    return (
      <WizardShellVao
        snapshot={snapshot}
        categoria={categoria}
        isDinamica={isDinamica}
      />
    );
  }
  return <WizardShellMedida snapshot={snapshot} categoria={categoria} />;
}
