type Props = {
  children: string;
  /** Texto pequeno no canto superior direito (ex.: "fórmula", "JSON"). */
  label?: string;
};

export function CodeBlock({ children, label }: Props) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/30">
      {label && (
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-3 py-1.5">
          <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-foreground/90">
        <code>{children}</code>
      </pre>
    </div>
  );
}
