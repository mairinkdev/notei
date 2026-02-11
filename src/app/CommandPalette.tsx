import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";
import { t } from "@/strings/t";

export type CommandAction = {
  id: string;
  label: string;
  keywords?: string;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  actions: CommandAction[];
  onSelect: (id: string) => void;
};

export function CommandPalette({
  open,
  onClose,
  actions,
  onSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? actions.filter((a) => {
        const q = query.toLowerCase();
        return (
          a.label.toLowerCase().includes(q) ||
          (a.keywords ?? "").toLowerCase().includes(q)
        );
      })
    : actions;

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].id);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, filtered, selectedIndex, onSelect]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[80px] bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          className="w-full max-w-xl rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={t("commandPalette.commandPaletteAria")}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder={t("commandPalette.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border-0 border-b border-[var(--surface-border)] bg-transparent px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-0"
          />
          <ul className="max-h-[280px] overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <li className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                {t("commandPalette.noCommandsFound")}
              </li>
            ) : (
              filtered.map((action, i) => (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(action.id);
                      onClose();
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors",
                      i === selectedIndex
                        ? "bg-[var(--surface-2)] text-[var(--text)]"
                        : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    {action.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
