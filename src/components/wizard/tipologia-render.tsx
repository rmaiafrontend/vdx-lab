"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EmbedVars } from "@/lib/render-mapping";

const RENDER_URL =
  process.env.NEXT_PUBLIC_VDX_RENDER_URL ?? "http://localhost:5174";

type Props = {
  renderKey: string;
  vars: EmbedVars;
  fillHeight?: boolean;
};

type Status = "loading" | "ready" | "error";

export function TipologiaRender({ renderKey, vars, fillHeight = false }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const readyRef = useRef(false);
  const lastVarsRef = useRef<EmbedVars>(vars);

  // Posta vdx:update quando vars muda — só depois do vdx:ready do embed.
  // O ref guarda o último vars pra flushar quando o ready chegar (race do
  // first-paint do iframe vs primeiro render desse componente).
  useEffect(() => {
    lastVarsRef.current = vars;
    if (!readyRef.current) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "vdx:update", vars }, "*");
  }, [vars]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | undefined;
      if (!data || typeof data !== "object") return;
      if (data.type === "vdx:ready") {
        readyRef.current = true;
        const win = iframeRef.current?.contentWindow;
        if (win && Object.keys(lastVarsRef.current).length > 0) {
          win.postMessage(
            { type: "vdx:update", vars: lastVarsRef.current },
            "*"
          );
        }
      } else if (data.type === "vdx:loaded") {
        setStatus("ready");
      } else if (data.type === "vdx:error") {
        setStatus("error");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const src = useMemo(() => {
    const u = new URL(RENDER_URL);
    u.searchParams.set("tipologia", renderKey);
    // chrome=0 esconde os ZoomControls do embed pra parecer parte do card.
    u.searchParams.set("chrome", "0");
    // vdx-lab roda em dark mode (className="dark" fixo no <html>) — fixa o
    // tema do embed pro fundo casar com o card escuro do host.
    u.searchParams.set("theme", "dark");
    return u.toString();
  }, [renderKey]);

  // Reset de status ao trocar a tipologia (embed remonta o projeto).
  useEffect(() => {
    readyRef.current = false;
    setStatus("loading");
  }, [renderKey]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm ${
        fillHeight ? "md:min-h-0 md:flex-1" : ""
      }`}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title={`Render: ${renderKey}`}
        className={`block w-full border-0 bg-transparent ${
          fillHeight ? "h-[min(75vh,720px)] md:h-full" : "h-[min(75vh,720px)]"
        }`}
      />
      {status !== "ready" && (
        <div
          className={`absolute inset-0 transition-opacity duration-200 ${
            status === "error" ? "bg-destructive/10" : "animate-pulse bg-muted/20"
          }`}
          aria-hidden
        />
      )}
    </div>
  );
}
