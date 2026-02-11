import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
};

export function Select({ value, options, placeholder, onChange, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = triggerRef.current;
      const p = panelRef.current;
      if (t?.contains(e.target as Node) || p?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    panel.style.position = "fixed";
    panel.style.top = `${rect.bottom + 4}px`;
    panel.style.left = `${rect.left}px`;
    panel.style.minWidth = `${rect.width}px`;
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "flex w-full items-center justify-between rounded-[var(--radius-control)] border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] shadow-sm transition-colors hover:bg-[var(--surface-2)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]",
          className
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={cn("truncate", !selected && "text-[var(--text-secondary)]")}>
          {selected ? selected.label : placeholder ?? "Select"}
        </span>
        <ChevronDown size={14} className="ml-2 shrink-0 text-[var(--text-secondary)]" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="z-50 max-h-[260px] overflow-auto rounded-[var(--radius-control)] border border-[var(--surface-border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-soft)] backdrop-blur-xl"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5",
                    opt.value === value && "bg-[var(--surface-2)]"
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

