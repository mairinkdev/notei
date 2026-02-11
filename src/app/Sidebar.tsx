import {
  Calendar,
  CalendarRange,
  FileText,
  ListTodo,
  LayoutGrid,
  Archive,
  Settings,
} from "lucide-react";
import type { Section } from "@/app/AppShell";
import { cn } from "@/lib/cn";
import { t } from "@/strings/t";

type SidebarProps = {
  section: Section;
  onSection: (s: Section) => void;
};

const SIDEBAR_KEYS: { section: Section; icon: React.ReactNode }[] = [
  { section: { type: "meetings" }, icon: <Calendar size={20} /> },
  { section: { type: "personal" }, icon: <FileText size={20} /> },
  { section: { type: "calendar" }, icon: <CalendarRange size={20} /> },
  { section: { type: "reminders" }, icon: <ListTodo size={20} /> },
  { section: { type: "templates" }, icon: <LayoutGrid size={20} /> },
  { section: { type: "archive" }, icon: <Archive size={20} /> },
  { section: { type: "settings" }, icon: <Settings size={20} /> },
];

export function Sidebar({ section, onSection }: SidebarProps) {
  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-[var(--surface-border)] bg-[var(--surface)]/50 py-3">
      <nav className="flex flex-col gap-0.5 px-2">
        {SIDEBAR_KEYS.map(({ section: s, icon }) => {
          const label = t(`sidebar.${s.type}`);
          return (
            <button
              key={s.type}
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left text-sm font-medium transition-colors",
                section.type === s.type
                  ? "bg-[var(--surface)] text-[var(--accent)] shadow-soft"
                  : "text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text)] dark:hover:bg-white/5"
              )}
              onClick={() => onSection(s)}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
