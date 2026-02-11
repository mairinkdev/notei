import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

type DropdownItem = {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type DropdownProps = {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
};

export function Dropdown({
  trigger,
  items,
  align = "left",
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const tr = triggerRef.current;
      const pn = panelRef.current;
      if (
        tr?.contains(e.target as Node) ||
        pn?.contains(e.target as Node)
      )
        return;
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
    panel.style.left =
      align === "left" ? `${rect.left}px` : `${rect.right - panel.offsetWidth}px`;
  }, [open, align]);

  return (
    <div className={cn("relative inline-block", className)}>
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="z-50 min-w-[160px] rounded-[var(--radius-control)] border border-[var(--surface-border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-soft)] backdrop-blur-xl"
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
                  onClick={() => {
                    item.onClick();
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
