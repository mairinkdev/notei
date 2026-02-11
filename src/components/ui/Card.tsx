import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-2)] shadow-[var(--shadow-soft)] backdrop-blur-xl",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";
