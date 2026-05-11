import { AlertTriangle, Info, Lightbulb } from "lucide-react";

type Variant = "info" | "warning" | "tip";

type Props = {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
};

const STYLES: Record<
  Variant,
  {
    border: string;
    bg: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
    titleClass: string;
  }
> = {
  info: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    text: "text-blue-300/90",
    icon: Info,
    titleClass: "text-blue-300",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    text: "text-amber-200/90",
    icon: AlertTriangle,
    titleClass: "text-amber-300",
  },
  tip: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    text: "text-emerald-200/90",
    icon: Lightbulb,
    titleClass: "text-emerald-300",
  },
};

export function Callout({ variant = "info", title, children }: Props) {
  const s = STYLES[variant];
  const Icon = s.icon;
  return (
    <div
      className={`flex gap-3 rounded-lg border ${s.border} ${s.bg} p-4`}
      role="note"
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${s.titleClass}`} />
      <div className="min-w-0 flex-1 space-y-1.5">
        {title && (
          <p className={`text-sm font-semibold ${s.titleClass}`}>{title}</p>
        )}
        <div className={`text-sm leading-relaxed ${s.text}`}>{children}</div>
      </div>
    </div>
  );
}
