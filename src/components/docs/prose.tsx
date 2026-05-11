import { Hash } from "lucide-react";

/**
 * Wrapper tipográfico para o conteúdo das páginas de documentação.
 * Aplica espaçamento e estilos consistentes a children semânticos.
 */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose-docs space-y-4 text-[15px] leading-relaxed text-foreground/95 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground">
      {children}
    </div>
  );
}

type HeadingProps = {
  id: string;
  children: React.ReactNode;
};

export function H1({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
      {children}
    </h1>
  );
}

export function H2({ id, children }: HeadingProps) {
  return (
    <h2
      id={id}
      className="group mt-10 scroll-mt-24 border-b border-border/40 pb-2 text-2xl font-semibold tracking-tight text-foreground"
    >
      <a
        href={`#${id}`}
        className="inline-flex items-center gap-2 no-underline hover:text-foreground"
      >
        {children}
        <Hash className="size-4 opacity-0 transition-opacity group-hover:opacity-50" />
      </a>
    </h2>
  );
}

export function H3({ id, children }: HeadingProps) {
  return (
    <h3
      id={id}
      className="group mt-6 scroll-mt-24 text-lg font-semibold tracking-tight text-foreground"
    >
      <a
        href={`#${id}`}
        className="inline-flex items-center gap-2 no-underline hover:text-foreground"
      >
        {children}
        <Hash className="size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
      </a>
    </h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed text-foreground/90">{children}</p>;
}

export function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
      {children}
    </p>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="ml-6 list-disc space-y-1.5 text-foreground/90 marker:text-muted-foreground">
      {children}
    </ul>
  );
}

export function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="ml-6 list-decimal space-y-1.5 text-foreground/90 marker:text-muted-foreground">
      {children}
    </ol>
  );
}

export function LI({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

export function A({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
    </a>
  );
}
