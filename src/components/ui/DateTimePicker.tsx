import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/cn";
import { TimeField } from "@/components/ui/TimeField";

type DateTimePickerProps = {
  value: Date;
  onChange: (value: Date) => void;
  withTime?: boolean;
  className?: string;
};

const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DateTimePicker({ value, onChange, withTime = true, className }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(value));
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMonth(startOfMonth(value));
  }, [value]);

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
    panel.style.top = `${rect.bottom + 6}px`;
    panel.style.left = `${rect.left}px`;
  }, [open]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const timeValue = useMemo(
    () => ({
      hour: value.getHours(),
      minute: value.getMinutes() - (value.getMinutes() % 5),
    }),
    [value]
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "flex w-full items-center justify-between rounded-[var(--radius-control)] border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-left text-sm text-[var(--text)] shadow-sm transition-colors hover:bg-[var(--surface-2)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]",
          className
        )}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">
          {withTime ? format(value, "yyyy-MM-dd HH:mm") : format(value, "yyyy-MM-dd")}
        </span>
        <Clock size={14} className="ml-2 shrink-0 text-[var(--text-secondary)]" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="z-50 w-[260px] rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-soft)] backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => setMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-medium text-[var(--text)]">
                  {format(month, "MMMM yyyy")}
                </span>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
                {WEEK_LABELS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => {
                  const isCurrentMonth = d.getMonth() === month.getMonth();
                  const selected = isSameDay(d, value);
                  const today = isToday(d);
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      onClick={() => {
                        const next = new Date(value);
                        next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                        onChange(next);
                      }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                        !isCurrentMonth && "text-[var(--text-secondary)]/60",
                        selected && "bg-[var(--accent)] text-white",
                        !selected &&
                          today &&
                          "border border-[var(--accent)] text-[var(--accent)]",
                        !selected &&
                          !today &&
                          "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                    >
                      {format(d, "d")}
                    </button>
                  );
                })}
              </div>
              {withTime && (
                <div className="mt-3">
                  <TimeField
                    value={timeValue}
                    onChange={(v) => {
                      if (!v) return;
                      const next = new Date(value);
                      next.setHours(v.hour, v.minute, 0, 0);
                      onChange(next);
                    }}
                    stepMinutes={5}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

