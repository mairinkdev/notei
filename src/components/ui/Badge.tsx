import { cn } from "@/lib/cn";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-chip)] border border-[var(--surface-border)] bg-[var(--surface)]/60 px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]",
        className
      )}
    >
      {children}
    </span>
  );
}
