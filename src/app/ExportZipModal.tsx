import { useState, useEffect, useRef } from "react";
import type { Note } from "@/features/notes/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { exportBatchAsZip, type ExportZipProgress } from "@/features/export/exportNote";
import { revealInFolder } from "@/features/share/shareNote";
import { getSettings } from "@/features/settings/repository";
import { t, tReplace } from "@/strings/t";

type ExportZipModalProps = {
  open: boolean;
  onClose: () => void;
  notes: Note[];
};

export function ExportZipModal({ open, onClose, notes }: ExportZipModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(notes.map((n) => n.id)));
  const [includeJson, setIncludeJson] = useState(true);
  const [includePng, setIncludePng] = useState(false);
  const [forceLight, setForceLight] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExportZipProgress | null>(null);
  const [failedPng, setFailedPng] = useState<{ id: string; title: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(notes.map((n) => n.id)));
      setProgress(null);
      setFailedPng([]);
      getSettings()
        .then((s) => setForceLight(!!s.export?.exportPngAlwaysLight))
        .catch(() => {});
    }
  }, [open, notes]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(notes.map((n) => n.id)));
  };

  const handleCancelExport = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const handleExport = async () => {
    const toExport = notes.filter((n) => selectedIds.has(n.id));
    if (toExport.length === 0) {
      setError(t("export.selectAtLeastOne"));
      return;
    }
    setLoading(true);
    setError(null);
    setFailedPng([]);
    abortRef.current = new AbortController();
    const { filePath, failedPng: pngFailures } = await exportBatchAsZip(
      toExport,
      { includeJson, includePng, forceLight, signal: abortRef.current.signal },
      { onProgress: setProgress }
    );
    const aborted = abortRef.current?.signal.aborted ?? false;
    abortRef.current = null;
    setLoading(false);
    setProgress(null);
    setFailedPng(pngFailures);
    if (filePath) {
      await revealInFolder(filePath);
      if (pngFailures.length === 0) onClose();
    } else if (!aborted) {
      setError(t("export.exportFailedOrCancelled"));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("export.exportAsZip")}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("export.selectNotesInclude")}
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeJson}
            onChange={(e) => setIncludeJson(e.target.checked)}
            className="rounded border-[var(--surface-border)]"
          />
          <span className="text-sm text-[var(--text)]">{t("export.includeJson")}</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includePng}
            onChange={(e) => setIncludePng(e.target.checked)}
            className="rounded border-[var(--surface-border)]"
          />
          <span className="text-sm text-[var(--text)]">{t("export.includePngPerNote")}</span>
        </label>
        {progress && (
          <p className="text-sm text-[var(--text-secondary)]">
            {tReplace("export.progressFormat", {
              current: String(progress.current),
              total: String(progress.total),
              message: progress.message,
            })}
          </p>
        )}
        {failedPng.length > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t("export.pngFailedFor")} {failedPng.map((f) => f.title).join(", ")}
          </p>
        )}
        <div className="max-h-48 overflow-y-auto rounded-[var(--radius-control)] border border-[var(--surface-border)] p-2">
          <Button variant="ghost" className="mb-2 w-full text-xs" onClick={selectAll}>
            {t("export.selectAll")}
          </Button>
          {notes.map((note) => (
            <label
              key={note.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(note.id)}
                onChange={() => toggle(note.id)}
                className="rounded border-[var(--surface-border)]"
              />
              <span className="truncate text-sm text-[var(--text)]">
                {note.title || t("notes.untitled")}
              </span>
            </label>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={loading ? handleCancelExport : onClose}>
            {loading ? t("export.cancelExport") : t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={loading || selectedIds.size === 0}
          >
            {loading ? t("export.exporting") : t("export.exportZip")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
