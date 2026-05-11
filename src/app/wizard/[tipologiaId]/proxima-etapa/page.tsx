import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function ProximaEtapaPage({
  params,
}: {
  params: Promise<{ tipologiaId: string }>;
}) {
  const { tipologiaId } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/30 text-muted-foreground">
        <Construction className="size-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
        Próxima etapa não implementada
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Este lab é apenas a calculadora. Revisão, confirmação e envio do
        orçamento ficam para uma versão futura.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href={`/wizard/${tipologiaId}`}>
          <ArrowLeft className="mr-1 size-4" />
          Voltar ao simulador
        </Link>
      </Button>
    </main>
  );
}
