import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="absolute inset-0 z-0 bg-black/30 backdrop-blur-sm"
          aria-hidden
        />
        <motion.div
          initial={
            reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
          }
          animate={
            reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
          }
          exit={
            reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
          }
          transition={{ duration: 0.16 }}
          className={cn(
            "relative z-[1] flex max-h-[78vh] w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] backdrop-blur-xl sm:w-[clamp(720px,72vw,920px)]",
            className
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "dialog-title" : undefined}
          data-dialog-root
        >
          {title && (
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] px-4 py-3">
              <h2
                id="dialog-title"
                className="text-sm font-medium text-[var(--text)]"
              >
                {title}
              </h2>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
