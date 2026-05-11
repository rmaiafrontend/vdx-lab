import { runPipelineVao } from "./pipeline-vao";
import { runPipelineMedida } from "./pipeline-medida";
import type {
  CalcInput,
  CalcInputMedida,
  CalcInputVao,
  CalcOutput,
} from "./types";

export function runPipeline(input: CalcInput): CalcOutput {
  // Discriminante mora em `input.tipologia.modo`. TS não estreita union por
  // campo aninhado, então castamos após o check.
  if (input.tipologia.modo === "VAO") {
    return runPipelineVao(input as CalcInputVao);
  }
  return runPipelineMedida(input as CalcInputMedida);
}

export { runPipelineVao, runPipelineMedida };
