import { useEffect, useState, useCallback } from "react";
import { listNotes, bulkUpdateNotes } from "@/features/notes/repository";
import type { Note } from "@/features/notes/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { RotateCcw } from "lucide-react";
import { t } from "@/strings/t";

type ArchiveViewProps = {
  onRestore: () => void;
};

export function ArchiveView({ onRestore }: ArchiveViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listNotes({ archived: true })
      .then(setNotes)
      .catch((e) => setError(e instanceof Error ? e.message : t("notes.failedToLoad")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = useCallback(
    (id: string) => {
      bulkUpdateNotes([id], { archived: false }).then(() => load());
    },
    [load]
  );

  const handleRestoreAll = useCallback(() => {
    if (notes.length === 0) return;
    bulkUpdateNotes(
      notes.map((n) => n.id),
      { archived: false }
    ).then(() => {
      load();
      onRestore();
    });
  }, [notes, load, onRestore]);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[var(--bg)] p-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-medium text-[var(--text)]">{t("archive.title")}</h2>
        {notes.length > 0 && (
          <Button variant="secondary" onClick={handleRestoreAll}>
            <RotateCcw size={16} />
            {t("archive.restoreAll")}
          </Button>
        )}
      </div>
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
          {t("archive.noArchivedNotes")}
        </p>
      )}
      {!loading && !error && notes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id} className="p-4">
              <p className="font-medium text-[var(--text)]">
                {note.title || t("notes.untitled")}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                {note.plainText || t("notes.noContent")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {note.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                {format(new Date(note.updatedAt), "MMM d, yyyy")}
              </p>
              <Button
                variant="ghost"
                className="mt-3 w-full"
                onClick={() => handleRestore(note.id)}
              >
                <RotateCcw size={14} />
                {t("archive.restore")}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
