import { useEffect, useState, useCallback, memo, type MouseEvent } from "react";
import { Plus, Pin, FileArchive, Trash2, Archive, PinOff, FileDown } from "lucide-react";
import { listNotes, createNote, updateNote, removeNote } from "@/features/notes/repository";
import { ExportZipModal } from "@/app/ExportZipModal";
import type { Note, NoteKind } from "@/features/notes/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { cn } from "@/lib/cn";
import { exportNoteAsMarkdown } from "@/features/export/exportNote";
import { t } from "@/strings/t";

type ListPaneProps = {
  filter: { kind?: NoteKind; archived?: boolean };
  searchQuery: string;
  selectedNoteId: string | null;
  onSelectNote: (id: string | null) => void;
};

export function ListPane({
  filter,
  searchQuery,
  selectedNoteId,
  onSelectNote,
}: ListPaneProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportZipOpen, setExportZipOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ note: Note; x: number; y: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listNotes({
      ...filter,
      query: searchQuery || undefined,
    })
      .then(setNotes)
      .catch((e) => setError(e instanceof Error ? e.message : t("notes.failedToLoad")))
      .finally(() => setLoading(false));
  }, [filter, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const handleNew = useCallback(() => {
    const kind = filter.kind ?? "personal";
    createNote(kind).then((note) => {
      setNotes((prev) => [note, ...prev]);
      onSelectNote(note.id);
    }).catch((e) => setError(e instanceof Error ? e.message : t("notes.failedToCreate")));
  }, [filter.kind, onSelectNote]);

  const openContextMenu = useCallback(
    (note: Note, event: MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        note,
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  useEffect(() => {
    if (!contextMenu) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    const handleResizeOrScroll = () => {
      setContextMenu(null);
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [contextMenu]);

  return (
    <div className="flex w-[320px] shrink-0 flex-col border-r border-[var(--surface-border)] bg-[var(--bg)]">
      <div className="flex items-center justify-between border-b border-[var(--surface-border)] px-4 py-3">
        <h2 className="text-sm font-medium text-[var(--text)]">
          {filter.kind === "meeting" ? t("notes.meetingNotes") : t("notes.personalNotes")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            className="h-8 gap-1 px-2"
            onClick={() => setExportZipOpen(true)}
            title={t("notes.exportAsZip")}
            disabled={notes.length === 0}
          >
            <FileArchive size={16} />
            ZIP
          </Button>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={handleNew} title={t("notes.newNote")}>
            <Plus size={18} />
          </Button>
        </div>
      </div>
      <ExportZipModal
        open={exportZipOpen}
        onClose={() => setExportZipOpen(false)}
        notes={notes}
      />
      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            {t("notes.loading")}
          </p>
        )}
        {error && (
          <p className="py-4 text-center text-sm text-red-500">{error}</p>
        )}
        {!loading && !error && notes.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            {t("notes.noNotesYet")}
          </p>
        )}
        {!loading && !error && notes.length > 0 && (
          <div className="space-y-1.5">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                selected={selectedNoteId === note.id}
                onSelect={() => onSelectNote(note.id)}
                onContextMenu={(event) => openContextMenu(note, event)}
              />
            ))}
          </div>
        )}
      </div>
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu(null)}
        >
          <div
            className="absolute z-50 min-w-[200px] rounded-[var(--radius-control)] border border-[var(--surface-border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-soft)] backdrop-blur-xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => {
                onSelectNote(contextMenu.note.id);
                setContextMenu(null);
              }}
            >
              <Pin size={16} className="opacity-0" />
              <span>{t("notes.open")}</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
              onClick={async () => {
                const note = contextMenu.note;
                await updateNote(note.id, { pinned: !note.pinned });
                setContextMenu(null);
                load();
              }}
            >
              {contextMenu.note.pinned ? (
                <PinOff size={16} />
              ) : (
                <Pin size={16} />
              )}
              <span>{contextMenu.note.pinned ? t("notes.unpin") : t("notes.pinToTop")}</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
              onClick={async () => {
                const note = contextMenu.note;
                await updateNote(note.id, { archived: true });
                setContextMenu(null);
                if (selectedNoteId === note.id) {
                  onSelectNote(null);
                }
                load();
              }}
            >
              <Archive size={16} />
              <span>{t("notes.archive")}</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
              onClick={async () => {
                const note = contextMenu.note;
                await exportNoteAsMarkdown(note);
                setContextMenu(null);
              }}
            >
              <FileDown size={16} />
              <span>{t("notes.exportAsMarkdown")}</span>
            </button>
            <div className="my-1 border-t border-[var(--surface-border)]" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10"
              onClick={async () => {
                const note = contextMenu.note;
                await removeNote(note.id);
                setContextMenu(null);
                if (selectedNoteId === note.id) {
                  onSelectNote(null);
                }
                load();
              }}
            >
              <Trash2 size={16} />
              <span>{t("notes.delete")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type NoteCardProps = {
  note: Note;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (event: MouseEvent) => void;
};

const NoteCard = memo(function NoteCard({ note, selected, onSelect, onContextMenu }: NoteCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer p-3 transition-colors",
        selected
          ? "ring-2 ring-[var(--accent)]"
          : "hover:bg-[var(--surface)]/80"
      )}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <div className="flex items-start gap-2">
        {note.pinned && (
          <Pin size={14} className="mt-0.5 shrink-0 text-[var(--text-secondary)]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--text)]">
            {note.title || t("notes.untitled")}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
            {note.plainText || t("notes.noContent")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.slice(0, 2).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            {note.participants.length > 0 && (
              <Badge>{note.participants.length} {t("notes.participants")}</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {format(new Date(note.updatedAt), "MMM d, yyyy")}
          </p>
        </div>
      </div>
    </Card>
  );
});
