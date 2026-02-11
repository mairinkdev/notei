import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sun, Moon, Search, Minus, Square, Maximize2, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTheme } from "@/theme/themeContext";
import { Button } from "@/components/ui/Button";
import { useThemeModeSync } from "@/features/settings/useThemeModeSync";
import { cn } from "@/lib/cn";
import { t } from "@/strings/t";

const TITLEBAR_H = 44;

type TitlebarProps = {
  searchQuery: string;
  onSearchQuery: (q: string) => void;
  searchOpen: boolean;
  onSearchOpen: (open: boolean) => void;
  onOpenCommandPalette?: () => void;
};

export function Titlebar({
  searchQuery,
  onSearchQuery,
  searchOpen,
  onSearchOpen,
  onOpenCommandPalette,
}: TitlebarProps) {
  const { resolved, setMode } = useTheme();
  useThemeModeSync();

  const toggleTheme = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  useEffect(() => {
    const unlisten = (async () => {
      try {
        const win = getCurrentWindow();
        return await win.onFocusChanged(() => {});
      } catch {
        return () => {};
      }
    })();
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "k" || e.key === "p") {
        e.preventDefault();
        if (onOpenCommandPalette) onOpenCommandPalette();
        else if (e.key === "k") onSearchOpen(!searchOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearchOpen, onOpenCommandPalette, searchOpen]);

  const isMac = navigator.platform?.toLowerCase().startsWith("mac");

  return (
    <header
      data-tauri-drag-region
      className={cn(
        "relative z-10 flex h-[44px] shrink-0 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface)]/80 px-3 backdrop-blur-xl",
        "select-none"
      )}
      style={{ height: TITLEBAR_H }}
    >
      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-2">
        <img
          src="/assets/logo-bg.png"
          alt=""
          className="h-6 w-6 shrink-0 select-none"
          width={24}
          height={24}
          draggable={false}
        />
        <span
          data-tauri-drag-region
          className="truncate text-sm font-medium text-[var(--text)]"
        >
          Notei
        </span>
        <button
          type="button"
          className="rounded-[var(--radius-chip)] p-1.5 text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
          onClick={() => onSearchOpen(!searchOpen)}
          title={t("titlebar.searchTitle")}
          aria-label={t("titlebar.searchAria")}
        >
          <Search size={16} strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={toggleTheme}
          title={resolved === "dark" ? t("titlebar.lightMode") : t("titlebar.darkMode")}
          aria-label={resolved === "dark" ? t("titlebar.lightMode") : t("titlebar.darkMode")}
        >
          {resolved === "dark" ? (
            <Sun size={16} strokeWidth={1.5} />
          ) : (
            <Moon size={16} strokeWidth={1.5} />
          )}
        </Button>
        {!isMac && <WindowControls />}
      </div>
      {searchOpen &&
        createPortal(
          <GlobalSearch
            open={searchOpen}
            query={searchQuery}
            onQuery={onSearchQuery}
            onClose={() => onSearchOpen(false)}
          />,
          document.body
        )}
    </header>
  );
}

const PILL_BTN =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[var(--text-secondary)] transition-[transform,background-color] duration-150 hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] active:scale-[0.96]";

function WindowControls() {
  const [win, setWin] = useState<ReturnType<typeof getCurrentWindow> | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    unlistenRef.current = null;
    try {
      const w = getCurrentWindow();
      setWin(w);
      w.isMaximized().then((m) => {
        if (!cancelled) setIsMaximized(m);
      });
      w.onResized(() => {
        if (cancelled) return;
        w.isMaximized().then((m) => setIsMaximized(m));
      }).then((fn) => {
        unlistenRef.current = fn;
      });
    } catch {
      setWin(null);
    }
    return () => {
      cancelled = true;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, []);

  const minimize = useCallback(() => {
    win?.minimize();
  }, [win]);

  const toggleMaximize = useCallback(() => {
    win?.toggleMaximize();
  }, [win]);

  const close = useCallback(() => {
    win?.close();
  }, [win]);

  if (!win) return null;

  return (
    <div
      className="flex items-center rounded-[14px] border border-[var(--surface-border)] bg-[var(--surface)] p-0.5 shadow-sm"
      role="group"
      aria-label={t("titlebar.windowControls")}
    >
      <button
        type="button"
        className={PILL_BTN}
        onClick={minimize}
        aria-label={t("titlebar.minimize")}
      >
        <Minus size={14} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        className={PILL_BTN}
        onClick={toggleMaximize}
        aria-label={isMaximized ? t("titlebar.restore") : t("titlebar.maximize")}
      >
        {isMaximized ? (
          <Maximize2 size={14} strokeWidth={1.5} />
        ) : (
          <Square size={14} strokeWidth={1.5} />
        )}
      </button>
      <button
        type="button"
        className={cn(
          PILL_BTN,
          "hover:bg-[var(--text-secondary)]/10 hover:text-[var(--text)]"
        )}
        onClick={close}
        aria-label={t("titlebar.close")}
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

type GlobalSearchProps = {
  open: boolean;
  query: string;
  onQuery: (q: string) => void;
  onClose: () => void;
};

function GlobalSearch({ open, query, onQuery, onClose }: GlobalSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) onQuery("");
  }, [open, onQuery]);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[72px] bg-black/25 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] px-3 py-3 mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t("titlebar.searchAria")}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={t("titlebar.searchPlaceholder")}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          className="w-full rounded-[var(--radius-control)] border border-[var(--surface-border)] bg-transparent px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none"
        />
        <p className="mt-2 px-2 text-xs text-[var(--text-secondary)]">
          {t("titlebar.searchHint")}
        </p>
      </div>
    </div>
  );
}
