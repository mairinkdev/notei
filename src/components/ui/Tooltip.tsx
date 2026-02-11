import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type TooltipProps = {
  content: string;
  children: ReactNode;
  className?: string;
};

export function Tooltip({ content, children, className }: TooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <span
        className={cn("inline-flex", className)}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setPos({ x: rect.left + rect.width / 2, y: rect.top - 6 });
        }}
        onMouseLeave={() => setPos(null)}
      >
        {children}
      </span>
      {pos &&
        createPortal(
          <div
            className="fixed z-[9999] -translate-x-1/2 -translate-y-full rounded-[var(--radius-chip)] bg-black/80 px-2 py-1 text-xs text-white shadow-lg pointer-events-none"
            style={{ left: pos.x, top: pos.y }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
