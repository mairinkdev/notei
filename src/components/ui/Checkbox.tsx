import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, disabled, ...props }, ref) => (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-sm text-[var(--text)]",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span
        className={cn(
          "relative inline-flex h-4 w-4 items-center justify-center rounded-[6px] border border-[var(--surface-border)] bg-[var(--surface)] shadow-sm transition-colors",
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
          {...props}
        />
        <span className="pointer-events-none h-2.5 w-2.5 rounded-[4px] bg-[var(--accent)] opacity-0 transition-opacity peer-checked:opacity-100" />
      </span>
      {label && <span className="select-none">{label}</span>}
    </label>
  )
);

Checkbox.displayName = "Checkbox";

