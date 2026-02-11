import { useEffect, useState, useCallback, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  listReminderLists,
  listSmart,
  listReminders,
  createReminder,
  completeReminder,
  uncompleteReminder,
  removeReminder,
  snoozeReminder,
} from "@/features/reminders/repository";
import type { Reminder, ReminderList, SmartFilterType } from "@/features/reminders/types";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { ReminderDetailsModal } from "@/app/ReminderDetailsModal";
import { format, parseISO } from "date-fns";
import { Plus, Circle, CircleCheck, MoreHorizontal, Flag } from "lucide-react";
import { cn } from "@/lib/cn";
import { parseQuickAdd } from "@/features/reminders/quickAddParser";
import { Input } from "@/components/ui/Input";
import { t } from "@/strings/t";

type FilterKind = SmartFilterType | { listId: string };

export function RemindersView() {
  const [lists, setLists] = useState<ReminderList[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filter, setFilter] = useState<FilterKind>("today");
  const [loading, setLoading] = useState(true);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, reminderData] = await Promise.all([
        listReminderLists(),
        typeof filter === "string"
          ? listSmart(filter)
          : listReminders({ listId: filter.listId, completed: false }),
      ]);
      setLists(listData);
      setReminders(reminderData);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = useCallback(
    async (r: Reminder) => {
      if (r.completedAt) {
        await uncompleteReminder(r.id);
      } else {
        await completeReminder(r.id);
      }
      load();
    },
    [load]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      await removeReminder(id);
      if (detailsId === id) setDetailsId(null);
      load();
    },
    [load, detailsId]
  );

  const handleSnooze = useCallback(
    async (id: string) => {
      await snoozeReminder(id, "1h");
      load();
    },
    [load]
  );

  const handleCreate = useCallback(async () => {
    setCreating(true);
    const listId = typeof filter === "object" ? filter.listId : "inbox";
    const r = await createReminder(listId, t("reminders.newReminder"));
    setCreating(false);
    setDetailsId(r.id);
    load();
  }, [filter, load]);

  useEffect(() => {
    const handler = () => handleCreate();
    window.addEventListener("notei:new-reminder", handler);
    return () => window.removeEventListener("notei:new-reminder", handler);
  }, [handleCreate]);

  const handleQuickAdd = useCallback(async () => {
    const trimmed = quickAdd.trim();
    if (!trimmed) return;
    const listId = typeof filter === "object" ? filter.listId : "inbox";
    const parsed = parseQuickAdd(trimmed);
    if (!parsed.title) return;
    setQuickAdd("");
    setCreating(true);
    const r = await createReminder(listId, parsed.title, {
      dueAt: parsed.dueAt,
      remindAt: parsed.remindAt,
    });
    setCreating(false);
    setDetailsId(r.id);
    load();
  }, [quickAdd, filter, load]);

  const filterLabel =
    typeof filter === "string"
      ? t("reminders." + filter)
      : lists.find((l) => l.id === filter.listId)?.name ?? t("reminders.list");

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-[200px] shrink-0 flex-col border-r border-[var(--surface-border)] bg-[var(--surface)]/50 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          {(["today", "scheduled", "overdue", "completed", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left text-sm font-medium transition-colors",
                filter === f
                  ? "bg-[var(--surface)] text-[var(--accent)] shadow-soft"
                  : "text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text)] dark:hover:bg-white/5"
              )}
              onClick={() => setFilter(f)}
            >
              {t(`reminders.${f}`)}
            </button>
          ))}
          <div className="my-1 border-t border-[var(--surface-border)]" />
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left text-sm font-medium transition-colors",
                typeof filter === "object" && filter.listId === list.id
                  ? "bg-[var(--surface)] text-[var(--accent)] shadow-soft"
                  : "text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text)] dark:hover:bg-white/5"
              )}
              onClick={() => setFilter({ listId: list.id })}
            >
              {list.emoji ? <span>{list.emoji}</span> : null}
              <span className="truncate">{list.name}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] px-4 py-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            {filterLabel}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">
              {reminders.length} {reminders.length !== 1 ? t("reminders.itemsPlural") : t("reminders.items")}
            </span>
            <Button
              variant="primary"
              className="h-8 gap-1"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus size={16} />
              {t("reminders.newReminder")}
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 border-b border-[var(--surface-border)] px-4 py-2">
          <Input
            placeholder={t("reminders.quickAddPlaceholder")}
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
            className="rounded-[var(--radius-control)] bg-[var(--surface-2)]"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-[var(--radius-control)] bg-[var(--surface-2)]"
                />
              ))}
            </div>
          ) : reminders.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              {t("reminders.noReminders")}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              <AnimatePresence mode="popLayout">
                {reminders.map((r) => (
                  <ReminderRow
                    key={r.id}
                    reminder={r}
                    onComplete={() => handleComplete(r)}
                    onEdit={() => setDetailsId(r.id)}
                    onRemove={() => handleRemove(r.id)}
                    onSnooze={() => handleSnooze(r.id)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
      <ReminderDetailsModal
        reminderId={detailsId}
        onClose={() => setDetailsId(null)}
        onSaved={() => {
          load();
          setDetailsId(null);
        }}
      />
    </div>
  );
}

const ReminderRow = forwardRef(function ReminderRow(
  {
    reminder,
    onComplete,
    onEdit,
    onRemove,
    onSnooze,
  }: {
    reminder: Reminder;
    onComplete: () => void;
    onEdit: () => void;
    onRemove: () => void;
    onSnooze: () => void;
  },
  ref: React.Ref<HTMLLIElement>
) {
  const dateStr = reminder.dueAt ?? reminder.remindAt;
  const dateLabel = dateStr
    ? format(parseISO(dateStr), "MMM d, HH:mm")
    : null;
  const isHigh = reminder.priority === "high" || reminder.priority === "medium";

  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-control)] border border-transparent bg-[var(--surface-2)] px-3 py-2.5 shadow-none transition-colors hover:border-[var(--surface-border)]",
        reminder.completedAt && "opacity-60"
      )}
    >
      <button
        type="button"
        aria-label={reminder.completedAt ? t("reminders.markIncomplete") : t("reminders.complete")}
        className="shrink-0 rounded-full p-0.5 text-[var(--text-secondary)] hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        onClick={onComplete}
      >
        {reminder.completedAt ? (
          <CircleCheck size={22} className="text-[var(--accent)]" strokeWidth={2} />
        ) : (
          <Circle size={22} className="border border-[var(--surface-border)]" strokeWidth={2} />
        )}
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onEdit}
      >
        <span
          className={cn(
            "text-sm font-medium text-[var(--text)]",
            reminder.completedAt && "line-through text-[var(--text-secondary)]"
          )}
        >
          {reminder.title}
        </span>
        {dateLabel && (
          <span className="ml-2 text-xs text-[var(--text-secondary)]">
            {dateLabel}
          </span>
        )}
      </button>
      {isHigh && (
        <Flag
          size={14}
          className={cn(
            "shrink-0 text-[var(--text-secondary)]",
            reminder.priority === "high" && "fill-current"
          )}
        />
      )}
      <Dropdown
        trigger={
          <Button variant="ghost" className="h-8 w-8 shrink-0 p-0">
            <MoreHorizontal size={18} />
          </Button>
        }
        items={[
          { id: "snooze", label: t("reminders.snooze1h"), onClick: onSnooze },
          { id: "edit", label: t("reminders.edit"), onClick: onEdit },
          { id: "delete", label: t("notes.delete"), onClick: onRemove },
        ]}
        align="right"
      />
    </motion.li>
  );
});
