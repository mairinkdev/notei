import { useEffect, useState, useCallback } from "react";
import { getReminder, updateReminder, removeReminder } from "@/features/reminders/repository";
import type { Reminder, ReminderPriority, ReminderRepeatFreq } from "@/features/reminders/types";
import { listNotes } from "@/features/notes/repository";
import type { Note } from "@/features/notes/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimeField } from "@/components/ui/TimeField";
import { cn } from "@/lib/cn";
import { t } from "@/strings/t";

type ReminderDetailsModalProps = {
  reminderId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function ReminderDetailsModal({
  reminderId,
  onClose,
  onSaved,
}: ReminderDetailsModalProps) {
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reminderId) {
      setReminder(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getReminder(reminderId), listNotes({})])
      .then(([r, n]) => {
        setReminder(r ?? null);
        setNotes(n);
      })
      .finally(() => setLoading(false));
  }, [reminderId]);

  const handleSave = useCallback(async () => {
    if (!reminder) return;
    await updateReminder(reminder.id, {
      title: reminder.title,
      notes: reminder.notes,
      dueAt: reminder.dueAt || undefined,
      remindAt: reminder.remindAt || undefined,
      repeat: reminder.repeat ?? undefined,
      priority: reminder.priority,
      linkedNoteId: reminder.linkedNoteId ?? undefined,
    });
    onSaved();
  }, [reminder, onSaved]);

  const handleDelete = useCallback(async () => {
    if (!reminder) return;
    await removeReminder(reminder.id);
    onSaved();
  }, [reminder, onSaved]);

  const canSave = !!reminder && reminder.title.trim().length > 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (canSave) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, canSave]);

  if (!reminderId || !reminder) return null;

  return (
    <Dialog open={!!reminderId} onClose={onClose} title={t("reminders.reminder")}>
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("notes.loading")}</p>
      ) : (
        <form
          className="flex h-full flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!(e.target instanceof HTMLFormElement) || !document.body.contains(e.target)) return;
            if (canSave) handleSave();
          }}
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-0.5 block text-xs font-medium text-[var(--text-secondary)]">
                  {t("notes.title")}
                </span>
                <Input
                  autoFocus
                  value={reminder.title}
                  onChange={(e) =>
                    setReminder((p) => (p ? { ...p, title: e.target.value } : null))
                  }
                  placeholder={t("reminders.reminderTitle")}
                />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-xs font-medium text-[var(--text-secondary)]">
                  {t("reminders.optionalNotes")}
                </span>
                <textarea
                  value={reminder.notes ?? ""}
                  onChange={(e) =>
                    setReminder((p) => (p ? { ...p, notes: e.target.value } : null))
                  }
                  placeholder={t("reminders.optionalNotes")}
                  rows={3}
                  className={cn(
                    "w-full rounded-[var(--radius-control)] border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  )}
                />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-xs font-medium text-[var(--text-secondary)]">
                  {t("reminders.linkNote")}
                </span>
                <Select
                  value={reminder.linkedNoteId ?? ""}
                  onChange={(v) =>
                    setReminder((p) => (p ? { ...p, linkedNoteId: v || undefined } : null))
                  }
                  options={[
                    { value: "", label: t("reminders.none") },
                    ...notes.map((n) => ({
                      value: n.id,
                      label: n.title || t("notes.untitled"),
                    })),
                  ]}
                />
              </label>
            </div>
            <div className="space-y-4">
              <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-2)]/60 p-3">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {t("reminders.when")}
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-0.5 block text-[10px] font-medium text-[var(--text-secondary)]">
                      {t("reminders.due")}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <DatePicker
                        value={reminder.dueAt ? new Date(reminder.dueAt) : new Date()}
                        onChange={(d) => {
                          const prev = reminder.dueAt
                            ? new Date(reminder.dueAt)
                            : new Date();
                          d.setHours(
                            prev.getHours(),
                            prev.getMinutes() - (prev.getMinutes() % 5),
                            0,
                            0
                          );
                          setReminder((p) =>
                            p ? { ...p, dueAt: d.toISOString() } : null
                          );
                        }}
                        className="w-full"
                      />
                      <TimeField
                        value={
                          reminder.dueAt
                            ? {
                                hour: new Date(reminder.dueAt).getHours(),
                                minute:
                                  new Date(reminder.dueAt).getMinutes() -
                                  (new Date(reminder.dueAt).getMinutes() % 5),
                              }
                            : null
                        }
                        onChange={(v) => {
                          if (!v) return;
                          const d = reminder.dueAt
                            ? new Date(reminder.dueAt)
                            : new Date();
                          d.setHours(v.hour, v.minute, 0, 0);
                          setReminder((p) =>
                            p ? { ...p, dueAt: d.toISOString() } : null
                          );
                        }}
                        stepMinutes={5}
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-[10px] font-medium text-[var(--text-secondary)]">
                      {t("reminders.remind")}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <DatePicker
                        value={
                          reminder.remindAt
                            ? new Date(reminder.remindAt)
                            : new Date()
                        }
                        onChange={(d) => {
                          const prev = reminder.remindAt
                            ? new Date(reminder.remindAt)
                            : new Date();
                          d.setHours(
                            prev.getHours(),
                            prev.getMinutes() - (prev.getMinutes() % 5),
                            0,
                            0
                          );
                          setReminder((p) =>
                            p ? { ...p, remindAt: d.toISOString() } : null
                          );
                        }}
                        className="w-full"
                      />
                      <TimeField
                        value={
                          reminder.remindAt
                            ? {
                                hour: new Date(reminder.remindAt).getHours(),
                                minute:
                                  new Date(reminder.remindAt).getMinutes() -
                                  (new Date(reminder.remindAt).getMinutes() % 5),
                              }
                            : null
                        }
                        onChange={(v) => {
                          if (!v) return;
                          const d = reminder.remindAt
                            ? new Date(reminder.remindAt)
                            : new Date();
                          d.setHours(v.hour, v.minute, 0, 0);
                          setReminder((p) =>
                            p ? { ...p, remindAt: d.toISOString() } : null
                          );
                        }}
                        stepMinutes={5}
                      />
                    </div>
                  </label>
                </div>
                <div className="relative z-10 flex flex-wrap gap-1.5">
                  {reminder.dueAt ? (
                    <>
                      <button
                        type="button"
                        className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        onClick={() => {
                          const due = new Date(reminder.dueAt as string);
                          setReminder((p) =>
                            p ? { ...p, remindAt: due.toISOString() } : null
                          );
                        }}
                      >
                        {t("reminders.atTime")}
                      </button>
                      <button
                        type="button"
                        className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        onClick={() => {
                          const due = reminder.dueAt ? new Date(reminder.dueAt) : new Date();
                          const d = new Date(due.getTime() - 5 * 60 * 1000);
                          setReminder((p) =>
                            p ? { ...p, remindAt: d.toISOString() } : null
                          );
                        }}
                      >
                        {t("reminders.fiveMinBefore")}
                      </button>
                      <button
                        type="button"
                        className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        onClick={() => {
                          const due = reminder.dueAt ? new Date(reminder.dueAt) : new Date();
                          const d = new Date(due.getTime() - 15 * 60 * 1000);
                          setReminder((p) =>
                            p ? { ...p, remindAt: d.toISOString() } : null
                          );
                        }}
                      >
                        {t("reminders.fifteenMin")}
                      </button>
                      <button
                        type="button"
                        className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        onClick={() => {
                          const due = reminder.dueAt ? new Date(reminder.dueAt) : new Date();
                          const d = new Date(due.getTime() - 60 * 60 * 1000);
                          setReminder((p) =>
                            p ? { ...p, remindAt: d.toISOString() } : null
                          );
                        }}
                      >
                        {t("reminders.oneHour")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        onClick={() => {
                          const d = new Date();
                          d.setMinutes(d.getMinutes() + 30, 0, 0);
                          setReminder((p) =>
                            p ? { ...p, remindAt: d.toISOString() } : null
                          );
                        }}
                      >
                        {t("reminders.in30m")}
                      </button>
                      <button
                        type="button"
                        className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        onClick={() => {
                          const d = new Date();
                          d.setMinutes(d.getMinutes() + 120, 0, 0);
                          setReminder((p) =>
                            p ? { ...p, remindAt: d.toISOString() } : null
                          );
                        }}
                      >
                        {t("reminders.in2h")}
                      </button>
                      <button
                        type="button"
                        className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          d.setHours(9, 0, 0, 0);
                          setReminder((p) =>
                            p ? { ...p, remindAt: d.toISOString() } : null
                          );
                        }}
                      >
                        {t("reminders.tomorrow9")}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-2)]/40 p-3">
                <label className="block">
                  <span className="mb-0.5 block text-xs font-medium text-[var(--text-secondary)]">
                    {t("reminders.repeat")}
                  </span>
                  <Select
                    value={reminder.repeat?.freq ?? "none"}
                    onChange={(v) => {
                      const value = v as ReminderRepeatFreq | "none";
                      setReminder((p) =>
                        p
                          ? {
                              ...p,
                              repeat:
                                value === "none"
                                  ? null
                                  : {
                                      freq: value,
                                      interval: p.repeat?.interval ?? 1,
                                      byWeekday: p.repeat?.byWeekday,
                                      endAt: p.repeat?.endAt,
                                    },
                            }
                          : null
                      );
                    }}
                    options={[
                      { value: "none", label: t("reminders.none") },
                      { value: "daily", label: t("reminders.daily") },
                      { value: "weekly", label: t("reminders.weekly") },
                      { value: "monthly", label: t("reminders.monthly") },
                      { value: "yearly", label: t("reminders.yearly") },
                    ]}
                  />
                </label>
                <label className="block">
                  <span className="mb-0.5 block text-xs font-medium text-[var(--text-secondary)]">
                    {t("reminders.priority")}
                  </span>
                  <Select
                    value={reminder.priority}
                    onChange={(v) =>
                      setReminder((p) =>
                        p ? { ...p, priority: v as ReminderPriority } : null
                      )
                    }
                    options={[
                      { value: "none", label: t("reminders.none") },
                      { value: "low", label: t("reminders.low") },
                      { value: "medium", label: t("reminders.medium") },
                      { value: "high", label: t("reminders.high") },
                    ]}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 mt-2 flex items-center justify-between gap-2 border-t border-[var(--surface-border)] px-1 pt-3">
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="text-xs text-red-500 hover:bg-red-500/10"
            >
              {t("notes.delete")}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose} className="text-xs px-4">
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!canSave}
                className="px-4 text-xs disabled:opacity-60"
              >
                {t("common.save")}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}
