import { useCallback } from "react";
import { useNavigate } from "@/app/useNavigate";
import type { Section } from "@/app/AppShell";
import { createNote } from "@/features/notes/repository";
import { Card } from "@/components/ui/Card";
import type { NoteKind } from "@/features/notes/types";
import { Calendar, FileText, ListTodo, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { t } from "@/strings/t";

type Template = {
  id: string;
  kind: NoteKind;
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  template: Partial<{
    title: string;
    content: Record<string, unknown>;
    plainText: string;
  }>;
};

const TEMPLATES: Template[] = [
  {
    id: "meeting",
    kind: "meeting",
    titleKey: "meeting",
    descKey: "meetingDesc",
    icon: <Calendar size={24} />,
    template: {
      title: "Meeting notes",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Agenda" }],
          },
          { type: "paragraph" },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Notes" }],
          },
          { type: "paragraph" },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Decisions" }],
          },
          { type: "paragraph" },
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Action Items" }],
          },
          { type: "paragraph" },
        ],
      },
      plainText: "Agenda Notes Decisions Action Items",
    },
  },
  {
    id: "routine",
    kind: "personal",
    titleKey: "routine",
    descKey: "routineDesc",
    icon: <ListTodo size={24} />,
    template: {
      title: "Routine",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Morning" }] },
          { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
          { type: "paragraph", content: [{ type: "text", text: "Evening" }] },
          { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
        ],
      },
      plainText: "Routine",
    },
  },
  {
    id: "journal",
    kind: "personal",
    titleKey: "journal",
    descKey: "journalDesc",
    icon: <BookOpen size={24} />,
    template: {
      title: "Journal",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      plainText: "",
    },
  },
  {
    id: "tasks",
    kind: "personal",
    titleKey: "tasks",
    descKey: "tasksDesc",
    icon: <FileText size={24} />,
    template: {
      title: "Tasks",
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "To do" }],
          },
          { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] },
        ],
      },
      plainText: "Tasks",
    },
  },
];

export function TemplatesView() {
  const navigate = useNavigate();

  const handleCreate = useCallback(
    (tmpl: Template) => {
      createNote(tmpl.kind, tmpl.template).then((note) => {
        const section: Section =
          tmpl.kind === "meeting" ? { type: "meetings" } : { type: "personal" };
        navigate(section, note.id);
      }).catch(() => {});
    },
    [navigate]
  );

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[var(--bg)] p-8">
      <h2 className="mb-6 text-xl font-medium text-[var(--text)]">{t("templates.title")}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {TEMPLATES.map((tmpl) => (
          <Card
            key={tmpl.id}
            className={cn(
              "cursor-pointer transition-transform hover:scale-[1.02]",
              "flex flex-col gap-3 p-5"
            )}
            onClick={() => handleCreate(tmpl)}
          >
            <div className="text-[var(--accent)]">{tmpl.icon}</div>
            <h3 className="font-medium text-[var(--text)]">{t("templates." + tmpl.titleKey)}</h3>
            <p className="text-sm text-[var(--text-secondary)]">{t("templates." + tmpl.descKey)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
