type Props = {
  headers: string[];
  /** Cada linha é um array de células (string ou ReactNode). */
  rows: React.ReactNode[][];
  /** Índices de colunas a serem renderizadas em fonte mono. */
  monoColumns?: number[];
};

export function RefTable({ headers, rows, monoColumns = [] }: Props) {
  const monoSet = new Set(monoColumns);
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/20">
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border/40 last:border-b-0 hover:bg-muted/10"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 align-top text-foreground/90 ${
                    monoSet.has(j) ? "font-mono text-xs" : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
