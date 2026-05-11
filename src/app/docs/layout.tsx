import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <DocsMobileNav />
          <Link
            href="/admin"
            className="hidden items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground md:inline-flex"
          >
            <ArrowLeft className="size-3" />
            voltar ao admin
          </Link>
          <div className="flex flex-1 items-center justify-center gap-2 md:flex-none">
            <BookOpen className="size-4 text-primary" />
            <p className="text-sm font-semibold tracking-tight">
              Documentação do lab
            </p>
          </div>
          <div className="hidden md:block md:w-[88px]" aria-hidden />
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Sidebar desktop */}
          <aside className="hidden md:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
              <DocsSidebar />
            </div>
          </aside>

          {/* Conteúdo */}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
