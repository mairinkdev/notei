import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/cn";

export type TimeValue = { hour: number; minute: number } | null;

type TimeFieldProps = {
  value: TimeValue;
  onChange: (v: TimeValue) => void;
  stepMinutes?: 5 | 10 | 15;
  label?: string;
  disabled?: boolean;
  presets?: Array<{ label: string; hour: number; minute: number }>;
  rightAdornment?: ReactNode;
  className?: string;
};

function roundToStep(m: number, step: number): number {
  return Math.round(m / step) * step;
}

function clampMinute(m: number, step: number): number {
  const r = roundToStep(Math.max(0, Math.min(59, m)), step);
  return r === 60 ? 60 - step : r;
}

function parseInput(raw: string, step: number): TimeValue | null {
  const s = raw.replace(/\s/g, "").replace(/[^0-9:]/g, "");
  if (!s) return null;
  const parts = s.split(":");
  let h: number;
  let m: number;
  if (parts.length >= 2) {
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10) || 0;
  } else {
    const digits = s.replace(/:/g, "");
    if (digits.length === 1) {
      h = parseInt(digits, 10);
      m = 0;
    } else if (digits.length === 2) {
      h = parseInt(digits, 10);
      m = 0;
    } else if (digits.length === 3) {
      h = parseInt(digits.slice(0, 1), 10);
      m = parseInt(digits.slice(1, 3), 10);
    } else {
      h = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2, 4), 10) || 0;
    }
  }
  if (Number.isNaN(h)) return null;
  h = Math.max(0, Math.min(23, h));
  m = clampMinute(m, step);
  return { hour: h, minute: m };
}

function formatTime(v: TimeValue): string {
  if (!v) return "";
  return `${String(v.hour).padStart(2, "0")}:${String(v.minute).padStart(2, "0")}`;
}

function buildSlots(step: number): { hour: number; minute: number }[] {
  const out: { hour: number; minute: number }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      out.push({ hour: h, minute: m });
    }
  }
  return out;
}

const DEFAULT_PRESETS = [
  { label: "Now", hour: -1, minute: -1 },
  { label: "09:00", hour: 9, minute: 0 },
  { label: "14:00", hour: 14, minute: 0 },
  { label: "19:00", hour: 19, minute: 0 },
  { label: "+15m", hour: -2, minute: 15 },
  { label: "+30m", hour: -2, minute: 30 },
];

export function TimeField({
  value,
  onChange,
  stepMinutes = 15,
  label,
  disabled,
  presets = DEFAULT_PRESETS,
  rightAdornment,
  className,
}: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [inputStr, setInputStr] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const displayValue = value ? formatTime(value) : "";
  const slots = useRef(buildSlots(stepMinutes)).current;

  useEffect(() => {
    setInputStr(displayValue);
  }, [displayValue]);

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
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Enter" && focusedIndex >= 0 && slots[focusedIndex]) {
        onChange(slots[focusedIndex]);
        setOpen(false);
        e.preventDefault();
        return;
      }
      const cols = 4;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((i) => (i < 0 ? 0 : Math.min(slots.length - 1, i + 1)));
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((i) => (i <= 0 ? -1 : Math.max(0, i - 1)));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => (i < 0 ? 0 : Math.min(slots.length - 1, i + cols)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => (i < 0 ? 0 : Math.max(0, i - cols)));
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, focusedIndex, slots, onChange]);

  useEffect(() => {
    if (open && focusedIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [open, focusedIndex]);

  useEffect(() => {
    if (!open || !triggerRef.current || !panelRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panel = panelRef.current;
    const modal = triggerRef.current.closest("[data-dialog-root]");
    const modalRect = modal?.getBoundingClientRect();
    const panelHeight = 280;
    const panelWidth = 280;
    let top = rect.bottom + 6;
    let left = rect.left;
    if (modalRect) {
      if (top + panelHeight > modalRect.bottom) top = rect.top - panelHeight - 6;
      if (left + panelWidth > modalRect.right) left = modalRect.right - panelWidth;
      if (left < modalRect.left) left = modalRect.left;
      if (top < modalRect.top) top = modalRect.top + 6;
    } else {
      if (top + panelHeight > window.innerHeight) top = rect.top - panelHeight - 6;
      left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
    }
    panel.style.position = "fixed";
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.width = `${panelWidth}px`;
  }, [open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9:]/g, "");
    if (v.length >= 2 && !v.includes(":") && v.length <= 3) {
      v = v.slice(0, 2) + ":" + v.slice(2);
    } else if (v.length > 5) {
      v = v.slice(0, 5);
    }
    setInputStr(v);
  };

  const handleInputBlur = () => {
    const parsed = parseInput(inputStr, stepMinutes);
    if (parsed) {
      onChange(parsed);
      setInputStr(formatTime(parsed));
    } else {
      setInputStr(displayValue);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const parsed = parseInput(inputStr, stepMinutes);
      if (parsed) {
        onChange(parsed);
        setInputStr(formatTime(parsed));
      }
    }
  };

  const applyPreset = (p: { label: string; hour: number; minute: number }) => {
    if (p.hour === -1 && p.minute === -1) {
      const now = new Date();
      onChange({ hour: now.getHours(), minute: roundToStep(now.getMinutes(), stepMinutes) });
    } else if (p.hour === -2) {
      const now = new Date();
      const totalM = now.getHours() * 60 + now.getMinutes() + p.minute;
      let h = Math.floor(totalM / 60) % 24;
      let m = roundToStep(totalM % 60, stepMinutes);
      if (m === 60) {
        m = 0;
        h = (h + 1) % 24;
      }
      onChange({ hour: h, minute: m });
    } else {
      onChange({ hour: p.hour, minute: p.minute });
    }
    setOpen(false);
  };

  const currentIndex = value
    ? slots.findIndex((s) => s.hour === value.hour && s.minute === value.minute)
    : -1;

  useEffect(() => {
    if (open) setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [open, currentIndex]);

  return (
    <div className={cn("relative", className)}>
      {label && (
        <span className="mb-0.5 block text-[10px] font-medium text-[var(--text-secondary)]">
          {label}
        </span>
      )}
      <div
        ref={triggerRef}
        className={cn(
          "flex min-h-[40px] items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 shadow-sm transition-colors",
          open && "border-[var(--accent)] ring-1 ring-[var(--accent)]",
          disabled && "opacity-60"
        )}
      >
        <input
          type="text"
          inputMode="numeric"
          placeholder="--:--"
          value={inputStr}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none"
          aria-label={label ?? "Time"}
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        <button
          type="button"
          onClick={() => !disabled && setOpen((o) => !o)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 focus:ring-offset-[var(--surface)] disabled:pointer-events-none"
          aria-label="Open time picker"
        >
          {rightAdornment ?? <Clock size={16} />}
        </button>
      </div>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="z-[100] rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)] backdrop-blur-xl"
              role="listbox"
            >
              <div className="mb-2 flex flex-wrap gap-1.5">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-2.5 py-1.5 text-xs text-[var(--text)] transition-[transform,background-color] hover:bg-[var(--surface-2)] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div
                ref={listRef}
                className="grid max-h-[220px] grid-cols-4 gap-1 overflow-y-auto overscroll-contain rounded-md py-0.5"
                style={{ scrollBehavior: "smooth" }}
              >
                {slots.map((slot, index) => {
                  const isSelected =
                    value?.hour === slot.hour && value?.minute === slot.minute;
                  const isFocused = focusedIndex === index;
                  return (
                    <button
                      key={`${slot.hour}-${slot.minute}`}
                      type="button"
                      data-index={index}
                      onClick={() => {
                        onChange(slot);
                        setOpen(false);
                      }}
                      onMouseEnter={() => setFocusedIndex(index)}
                      className={cn(
                        "flex min-h-[40px] items-center justify-center rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-inset",
                        isSelected
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5",
                        isFocused && !isSelected && "bg-black/5 dark:bg-white/5"
                      )}
                    >
                      {formatTime(slot)}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
