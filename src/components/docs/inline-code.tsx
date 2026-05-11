export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[0.875em] text-foreground">
      {children}
    </code>
  );
}
