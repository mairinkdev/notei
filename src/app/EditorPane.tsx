import { useEffect, useState, useCallback, useRef } from "react";
import { getNote, updateNote } from "@/features/notes/repository";
import type { Note, NoteAttachment } from "@/features/notes/types";
import { NoteEditor } from "@/features/notes/NoteEditor";
import { ExportCard } from "@/components/ExportCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { X, Download, Share2, Save } from "lucide-react";
import { format } from "date-fns";
import {
  exportNoteAsPng,
  exportNoteAsMarkdown,
  exportNoteAsJson,
  noteToMarkdown,
} from "@/features/export/exportNote";
import {
  copyImageToClipboard,
  copyTextToClipboard,
  revealInFolder,
  openPath,
  openUrl,
  getShareLinks,
} from "@/features/share/shareNote";
import { getSettings } from "@/features/settings/repository";
import { isTauri } from "@/lib/tauri";
import { t } from "@/strings/t";

type EditorPaneProps = {
  noteId: string | null;
  onClose: () => void;
  onUnsavedChange?: (unsaved: boolean) => void;
};

export function EditorPane({ noteId, onClose, onUnsavedChange }: EditorPaneProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [autosave, setAutosave] = useState<{ mode: "off" | "afterDelay" | "onFocusChange"; delayMs: number }>({
    mode: "afterDelay",
    delayMs: 1000,
  });
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);
  const lastExportedPath = useRef<string | null>(null);
  const lastSavedContent = useRef<string>("");
  const lastSavedTitle = useRef<string>("");
  const [dirty, setDirty] = useState(false);
  const [exportPngForceLight, setExportPngForceLight] = useState(false);
  const noteRef = useRef<Note | null>(null);
  const dirtyRef = useRef(false);
  noteRef.current = note;
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!noteId) {
      setNote(null);
      setError(null);
      setDirty(false);
      return;
    }
    setLoading(true);
    setError(null);
    setDirty(false);
    getNote(noteId)
      .then((n) => {
        if (n) {
          lastSavedContent.current = JSON.stringify({
            c: n.content,
            p: n.plainText,
          });
          lastSavedTitle.current = n.title;
        }
        setNote(n);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t("notes.failedToLoad"));
        setLoading(false);
      });
  }, [noteId]);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setExportPngForceLight(!!s.export?.exportPngAlwaysLight);
        if (s.autosave) setAutosave(s.autosave);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!onUnsavedChange) return;
    const unsaved = dirty && autosave.mode === "off";
    onUnsavedChange(unsaved);
    return () => onUnsavedChange(false);
  }, [dirty, autosave.mode, onUnsavedChange]);

  const flushSave = useCallback(
    (
      currentNote: Note,
      content: Record<string, unknown>,
      plainText: string,
      title: string
    ): Promise<void> => {
      const contentKey = JSON.stringify({ c: content, p: plainText });
      const contentChanged = contentKey !== lastSavedContent.current;
      const titleChanged = title !== lastSavedTitle.current;
      if (!contentChanged && !titleChanged) {
        setDirty(false);
        return Promise.resolve();
      }
      const promises: Promise<unknown>[] = [];
      if (contentChanged) {
        lastSavedContent.current = contentKey;
        promises.push(
          updateNote(currentNote.id, { content, plainText }).then((updated) => {
            if (updated) setNote(updated);
          })
        );
      }
      if (titleChanged) {
        lastSavedTitle.current = title;
        promises.push(
          updateNote(currentNote.id, { title }).then((updated) => {
            if (updated) setNote(updated);
          })
        );
      }
      setDirty(false);
      return Promise.all(promises).catch(() => {}) as Promise<void>;
    },
    []
  );

  useEffect(() => {
    const handler = () => {
      if (note && dirtyRef.current && noteRef.current) {
        flushSave(
          noteRef.current,
          noteRef.current.content,
          noteRef.current.plainText,
          noteRef.current.title
        ).then(() => {
          window.dispatchEvent(new CustomEvent("notei:flush-save-done"));
        });
      } else {
        window.dispatchEvent(new CustomEvent("notei:flush-save-done"));
      }
    };
    window.addEventListener("notei:flush-save-and-quit", handler);
    return () => window.removeEventListener("notei:flush-save-and-quit", handler);
  }, [note, flushSave]);

  const handleAttachmentAdded = useCallback(
    (attachment: NoteAttachment) => {
      if (!note) return;
      const next = [...note.attachments, attachment];
      setNote((prev) => (prev ? { ...prev, attachments: next } : null));
      updateNote(note.id, { attachments: next }).catch(() => {});
    },
    [note]
  );

  const handleContentChange = useCallback(
    (content: Record<string, unknown>, plainText: string) => {
      if (!note) return;
      setNote((prev) => (prev ? { ...prev, content, plainText } : null));
      setDirty(true);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (autosave.mode === "off") return;
      if (autosave.mode === "onFocusChange") return;
      saveTimeout.current = setTimeout(() => {
        saveTimeout.current = null;
        const key = JSON.stringify({ c: content, p: plainText });
        if (key === lastSavedContent.current) return;
        lastSavedContent.current = key;
        updateNote(note.id, { content, plainText }).then((updated) => {
          if (updated) setNote(updated);
          setDirty(false);
        }).catch(() => {});
      }, autosave.delayMs);
    },
    [note, autosave.mode, autosave.delayMs]
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      if (!note) return;
      setNote((prev) => (prev ? { ...prev, title } : null));
      setDirty(true);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (autosave.mode === "off") return;
      if (autosave.mode === "onFocusChange") return;
      saveTimeout.current = setTimeout(() => {
        saveTimeout.current = null;
        if (title === lastSavedTitle.current) return;
        lastSavedTitle.current = title;
        updateNote(note.id, { title }).then((updated) => {
          if (updated) setNote(updated);
          setDirty(false);
        }).catch(() => {});
      }, autosave.delayMs);
    },
    [note, autosave.mode, autosave.delayMs]
  );

  const handleBlur = useCallback(() => {
    if (autosave.mode !== "onFocusChange" || !note) return;
    flushSave(note, note.content, note.plainText, note.title);
  }, [autosave.mode, note, flushSave]);

  const handleSaveClick = useCallback(() => {
    if (!note) return;
    flushSave(note, note.content, note.plainText, note.title);
  }, [note, flushSave]);

  useEffect(() => {
    if (autosave.mode !== "onFocusChange" || !dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [autosave.mode, dirty]);

  useEffect(() => {
    if (autosave.mode !== "onFocusChange") return;
    const doFlush = () => {
      if (!dirtyRef.current || !noteRef.current) return;
      flushSave(
        noteRef.current,
        noteRef.current.content,
        noteRef.current.plainText,
        noteRef.current.title
      );
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") doFlush();
    };
    const onPageHide = () => doFlush();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    let unlisten: (() => void) | undefined;
    if (isTauri()) {
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => {
          return getCurrentWindow().onCloseRequested(async (event) => {
            if (!dirtyRef.current || !noteRef.current) return;
            event.preventDefault();
            const n = noteRef.current;
            await flushSave(n, n.content, n.plainText, n.title);
            getCurrentWindow().close();
          });
        })
        .then((fn) => {
          unlisten = fn;
        })
        .catch(() => {});
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      unlisten?.();
    };
  }, [autosave.mode, flushSave]);

  const handleExportPng = useCallback(async () => {
    setExportError(null);
    const el = exportCardRef.current;
    if (!el) {
      setExportError(t("notes.cannotCapture"));
      return;
    }
    const path = await exportNoteAsPng(el);
    if (path) {
      lastExportedPath.current = path;
      setExportError(null);
    } else {
      setExportError(t("notes.exportFailedOrCancelled"));
    }
  }, []);

  const handleExportMd = useCallback(async () => {
    setExportError(null);
    if (!note) return;
    const path = await exportNoteAsMarkdown(note);
    if (!path) setExportError(t("notes.exportFailedOrCancelled"));
  }, [note]);

  const handleExportJson = useCallback(async () => {
    setExportError(null);
    if (!note) return;
    const path = await exportNoteAsJson(note);
    if (!path) setExportError(t("notes.exportFailedOrCancelled"));
  }, [note]);

  const handleCopyMarkdown = useCallback(async () => {
    setExportError(null);
    if (!note) return;
    const md = noteToMarkdown(note);
    const ok = await copyTextToClipboard(md);
    if (!ok) setExportError(t("notes.copyFailed"));
  }, [note]);

  const handleCopyImage = useCallback(async () => {
    setExportError(null);
    const el = exportCardRef.current;
    if (!el) {
      setExportError(t("notes.cannotCapture"));
      return;
    }
    const ok = await copyImageToClipboard(el);
    if (!ok) setExportError(t("notes.copyFailed"));
  }, []);

  const handleReveal = useCallback(async () => {
    setExportError(null);
    const el = exportCardRef.current;
    if (!el) return;
    const path = await exportNoteAsPng(el);
    if (path) await revealInFolder(path);
  }, []);

  const handleOpenFile = useCallback(async () => {
    if (lastExportedPath.current) {
      await openPath(lastExportedPath.current);
      return;
    }
    const path = await exportNoteAsPng(exportCardRef.current!);
    if (path) {
      lastExportedPath.current = path;
      await openPath(path);
    }
  }, []);

  const exportItems = [
    { id: "png", label: t("notes.exportAsPng"), onClick: handleExportPng },
    { id: "md", label: t("notes.exportAsMarkdownMenu"), onClick: handleExportMd },
    { id: "json", label: "Export as JSON", onClick: handleExportJson },
  ];

  const shareItems = [
    { id: "copy-md", label: t("notes.copyAsMarkdown"), onClick: handleCopyMarkdown },
    { id: "copy", label: t("notes.copyAsImage"), onClick: handleCopyImage },
    { id: "reveal", label: t("notes.revealInFolder"), onClick: handleReveal },
    { id: "open", label: t("notes.saveOpenFile"), onClick: handleOpenFile },
    ...getShareLinks().map((link) => ({
      id: link.name,
      label: `${t("notes.openApp")} ${link.name}`,
      onClick: () => openUrl(link.url),
    })),
  ];

  if (!noteId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--bg)]">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("notes.selectNoteOrCreate")}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--bg)]">
        <p className="text-sm text-[var(--text-secondary)]">{t("notes.loading")}</p>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[var(--bg)]">
        <p className="text-sm text-red-500">{error ?? t("notes.noteNotFound")}</p>
        <Button variant="ghost" onClick={onClose}>
          {t("notes.close")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg)]">
      <div
        className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] px-4 py-2"
        onBlur={handleBlur}
      >
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={note.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={handleBlur}
            className="w-full bg-transparent text-lg font-medium text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none"
            placeholder={t("notes.title")}
          />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {autosave.mode === "off" && dirty && (
              <span className="text-xs text-[var(--text-secondary)]">{t("notes.unsaved")}</span>
            )}
            <span className="text-xs text-[var(--text-secondary)]">
              {format(new Date(note.updatedAt), "MMM d, yyyy HH:mm")}
            </span>
            {note.participants.length > 0 && (
              <div className="flex gap-1">
                {note.participants.map((p) => (
                  <Badge key={p}>{p}</Badge>
                ))}
              </div>
            )}
            {note.tags.length > 0 && (
              <div className="flex gap-1">
                {note.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {autosave.mode === "off" && (
            <Button
              variant="primary"
              className="h-8 gap-1"
              onClick={handleSaveClick}
              disabled={!dirty}
            >
              <Save size={16} />
              {t("notes.save")}
            </Button>
          )}
          {exportError && (
            <span className="text-xs text-red-500">{exportError}</span>
          )}
          <Dropdown
            trigger={<Button variant="ghost" className="h-8 gap-1"><Download size={16} /> {t("notes.export")}</Button>}
            items={exportItems}
          />
          <Dropdown
            trigger={<Button variant="ghost" className="h-8 gap-1"><Share2 size={16} /> {t("notes.share")}</Button>}
            items={shareItems}
            align="right"
          />
          <Button variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
      </div>
      <div
        ref={exportCardRef}
        className="absolute left-[-9999px] top-0 w-[560px]"
        aria-hidden
      >
        <ExportCard
          note={note}
          forceLight={exportPngForceLight}
        />
      </div>
      <div ref={editorWrapRef} className="flex-1 overflow-y-auto px-4 py-4" onBlur={handleBlur}>
        <NoteEditor
          key={note.id}
          noteId={note.id}
          content={note.content}
          onChange={handleContentChange}
          onAttachmentAdded={handleAttachmentAdded}
          kind={note.kind}
        />
      </div>
    </div>
  );
}
