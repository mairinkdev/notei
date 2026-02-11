import { useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@/lib/tauri";

type ResizeDirection =
  | "East"
  | "North"
  | "NorthEast"
  | "NorthWest"
  | "South"
  | "SouthEast"
  | "SouthWest"
  | "West";

const HANDLE_SIZE = 8;

function useResize(direction: ResizeDirection) {
  return useCallback(() => {
    if (!isTauri()) return;
    getCurrentWindow().startResizeDragging(direction).catch(() => {});
  }, [direction]);
}

function Handle({
  direction,
  cursor,
  className,
}: {
  direction: ResizeDirection;
  cursor: string;
  className: string;
}) {
  const onResize = useResize(direction);
  return (
    <div
      role="presentation"
      className={className}
      style={{ cursor }}
      onPointerDown={(e) => {
        if (e.button === 0) onResize();
      }}
    />
  );
}

export function ResizeHandles() {
  if (!isTauri()) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5]"
      style={{
        overflow: "hidden",
        borderRadius: "var(--radius-app)",
        ["--handle-size" as string]: `${HANDLE_SIZE}px`,
      }}
    >
      <div className="pointer-events-auto absolute inset-0">
        <Handle
          direction="North"
          cursor="ns-resize"
          className="absolute left-0 right-0 top-0 h-[var(--handle-size)]"
        />
        <Handle
          direction="South"
          cursor="ns-resize"
          className="absolute bottom-0 left-0 right-0 h-[var(--handle-size)]"
        />
        <Handle
          direction="West"
          cursor="ew-resize"
          className="absolute left-0 top-0 bottom-0 w-[var(--handle-size)]"
        />
        <Handle
          direction="East"
          cursor="ew-resize"
          className="absolute right-0 top-0 bottom-0 w-[var(--handle-size)]"
        />
        <Handle
          direction="NorthWest"
          cursor="nwse-resize"
          className="absolute left-0 top-0 h-[var(--handle-size)] w-[var(--handle-size)]"
        />
        <Handle
          direction="NorthEast"
          cursor="nesw-resize"
          className="absolute right-0 top-0 h-[var(--handle-size)] w-[var(--handle-size)]"
        />
        <Handle
          direction="SouthWest"
          cursor="nesw-resize"
          className="absolute bottom-0 left-0 h-[var(--handle-size)] w-[var(--handle-size)]"
        />
        <Handle
          direction="SouthEast"
          cursor="nwse-resize"
          className="absolute bottom-0 right-0 h-[var(--handle-size)] w-[var(--handle-size)]"
        />
      </div>
    </div>
  );
}
