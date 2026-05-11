"use client";

import type { FormState } from "./form-state";
import { SimuladorVao } from "./simulador-vao";
import { SimuladorMedida } from "./simulador-medida";

type Props = { form: FormState };

export function Simulador({ form }: Props) {
  if (form.modoDeProducao === "VAO") {
    return <SimuladorVao form={form} />;
  }
  return <SimuladorMedida form={form} />;
}
