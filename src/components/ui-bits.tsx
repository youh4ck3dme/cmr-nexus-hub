import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { BadgeTone } from "@/lib/tones";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:mb-6 sm:flex sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

const toneClass: Record<BadgeTone, string> = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-destructive/15 text-destructive",
  info: "bg-primary/15 text-primary",
  muted: "bg-muted text-muted-foreground",
  accent: "bg-accent/15 text-accent",
};

export function StatusBadge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: BadgeTone;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 truncate text-2xl font-semibold">{value}</div>
          {hint ? <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        {icon ? (
          <div
            className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md", toneClass[tone])}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      {icon ? (
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {description ? (
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {action}
    </Card>
  );
}

export function BtnPrimary({
  children,
  onClick,
  type = "button",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BtnGhost({
  children,
  onClick,
  className,
  as,
  href,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  as?: "a";
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-md border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
    className,
  );
  if (as === "a" && href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(cls, "disabled:opacity-50")}
    >
      {children}
    </button>
  );
}
