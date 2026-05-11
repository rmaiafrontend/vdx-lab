import Link from "next/link";
import { Boxes } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <Link
            href="/admin"
            className="group flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <span className="flex size-7 items-center justify-center rounded-md border border-primary/30 bg-primary/15 text-primary transition-transform group-hover:scale-105">
              <Boxes className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Tipologia <span className="text-primary">Lab</span>
            </span>
          </Link>
          <AdminNav />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
