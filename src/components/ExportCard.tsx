import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import type { Note } from "@/features/notes/types";
import { Underline } from "@/features/notes/underlineExtension";
import { format } from "date-fns";
import { cn } from "@/lib/cn";
import { t } from "@/strings/t";

const EXPORT_EXTENSIONS = [
  StarterKit,
  Underline,
  Link.configure({ openOnClick: false }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Image.configure({ inline: false, allowBase64: true }),
];

type ExportCardProps = {
  note: Note;
  forceLight?: boolean;
  className?: string;
};

export function ExportCard({ note, forceLight, className }: ExportCardProps) {
  const html = generateHTML(
    note.content as Parameters<typeof generateHTML>[0],
    EXPORT_EXTENSIONS
  );
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--bg)] p-6 shadow-[var(--shadow-soft)]",
        forceLight && "export-force-light",
        className
      )}
      data-export-card
    >
      <h1 className="text-xl font-semibold text-[var(--text)]">
        {note.title || t("notes.untitled")}
      </h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {format(new Date(note.updatedAt), "yyyy-MM-dd HH:mm")}
      </p>
      {(note.participants.length > 0 || note.tags.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {note.participants.map((p) => (
            <span
              key={p}
              className="rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
            >
              {p}
            </span>
          ))}
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[var(--radius-chip)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div
        className="prose prose-sm dark:prose-invert mt-4 max-w-none text-[var(--text)] [&_img]:max-w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
