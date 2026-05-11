"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocsSidebar } from "./docs-sidebar";

export function DocsMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer ao trocar de página
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Trava scroll do body enquanto aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="size-9 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu da documentação"
      >
        <Menu className="size-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal>
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border/60 bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <p className="text-sm font-semibold tracking-tight">Documentação</p>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              <DocsSidebar onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
