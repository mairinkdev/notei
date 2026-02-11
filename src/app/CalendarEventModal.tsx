import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/features/calendar/repository";
import type { CalendarEvent } from "@/features/calendar/types";
import { listNotes } from "@/features/notes/repository";
import type { Note } from "@/features/notes/types";
import { createReminder, removeReminder, getReminder, updateReminder } from "@/features/reminders/repository";
import { listReminderLists } from "@/features/reminders/repository";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimeField } from "@/components/ui/TimeField";
import { cn } from "@/lib/cn";
import { t } from "@/strings/t";

const CALENDAR_REMIND_LABELS = {
  fiveMinBefore: "calendar.fiveMinBefore",
  tenMinBefore: "calendar.tenMinBefore",
  thirtyMinBefore: "calendar.thirtyMinBefore",
  oneHourBefore: "calendar.oneHourBefore",
  oneDayBefore: "calendar.oneDayBefore",
} as const;
const REMIND_OFFSETS: { labelKey: keyof typeof CALENDAR_REMIND_LABELS; minutes: number }[] = [
  { labelKey: "fiveMinBefore", minutes: 5 },
  { labelKey: "tenMinBefore", minutes: 10 },
  { labelKey: "thirtyMinBefore", minutes: 30 },
  { labelKey: "oneHourBefore", minutes: 60 },
  { labelKey: "oneDayBefore", minutes: 24 * 60 },
];

type CalendarEventModalProps = {
  eventId: string | null;
  initialDate?: Date;
  initialEndDate?: Date;
  onClose: () => void;
  onSaved: () => void;
};

export function CalendarEventModal({
  eventId,
  initialDate,
  initialEndDate,
  onClose,
  onSaved,
}: CalendarEventModalProps) {
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteQuery, setNoteQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [remindMinutes, setRemindMinutes] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | "custom">(60);

  const isNew = !eventId;
  const timeZoneLabel = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz ? `Local time · ${tz}` : "Local time";
    } catch {
      return "Local time";
    }
  }, []);

  useEffect(() => {
    if (eventId) {
      setLoading(true);
      Promise.all([getCalendarEvent(eventId), listNotes({})])
        .then(async ([e, n]) => {
          setEvent(e ?? null);
          setNotes(n);
          if (e?.reminderIds?.length) {
            const r = await getReminder(e.reminderIds[0]);
            if (r?.remindAt && e.startAt) {
              const diff = new Date(e.startAt).getTime() - new Date(r.remindAt).getTime();
              const mins = Math.round(diff / (60 * 1000));
              const match = REMIND_OFFSETS.find((o) => o.minutes === mins);
              if (match) setRemindMinutes(match.minutes);
            }
          }
        })
        .finally(() => setLoading(false));
    } else {
      listNotes({}).then(setNotes);
      const start = initialDate ?? new Date();
      const end = initialEndDate ?? new Date(start.getTime() + 60 * 60 * 1000);
      setEvent({
        id: "",
        title: "",
        notes: undefined,
        location: undefined,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        allDay: false,
        reminderIds: [],
        linkedNoteId: null,
        participants: undefined,
        color: null,
        createdAt: "",
        updatedAt: "",
      });
      setLoading(false);
    }
  }, [eventId, initialDate, initialEndDate]);

  useEffect(() => {
    if (!event || event.allDay) return;
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    const diffMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / (60 * 1000)));
    const presets = [15, 30, 45, 60, 120];
    const preset = presets.find((m) => m === diffMinutes);
    setDurationMinutes(preset ?? "custom");
  }, [event]);

  const filteredNotes = noteQuery.trim()
    ? notes.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(noteQuery.toLowerCase()) ||
          n.plainText.toLowerCase().includes(noteQuery.toLowerCase())
      )
    : notes;

  const handleSave = useCallback(async () => {
    if (!event) return;
    if (isNew) {
      const rest = {
        title: event.title,
        notes: event.notes,
        location: event.location,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        timezone: event.timezone,
        reminderIds: event.reminderIds,
        linkedNoteId: event.linkedNoteId,
        participants: event.participants,
        color: event.color,
        recurrence: event.recurrence,
      };
      const created = await createCalendarEvent(rest);
      if (remindMinutes !== null && remindMinutes > 0) {
        const lists = await listReminderLists();
        const inboxId = lists.find((l) => l.id === "inbox")?.id ?? lists[0]?.id;
        if (inboxId) {
          const remindAt = new Date(new Date(created.startAt).getTime() - remindMinutes * 60 * 1000).toISOString();
          const rem = await createReminder(inboxId, created.title, {
            notes: created.notes,
            remindAt,
            dueAt: created.startAt,
            linkedNoteId: created.linkedNoteId ?? undefined,
          });
          await updateCalendarEvent(created.id, { reminderIds: [rem.id] });
        }
      }
    } else {
      await updateCalendarEvent(event.id, {
        title: event.title,
        notes: event.notes,
        location: event.location,
        startAt: event.startAt,
        endAt: event.endAt,
        allDay: event.allDay,
        linkedNoteId: event.linkedNoteId ?? undefined,
        participants: event.participants,
      });
      if (remindMinutes !== null && event.reminderIds.length > 0) {
        const r = await getReminder(event.reminderIds[0]);
        if (r) {
          const remindAt = new Date(new Date(event.startAt).getTime() - remindMinutes * 60 * 1000).toISOString();
          await updateReminder(r.id, { remindAt, dueAt: event.startAt });
        }
      }
    }
    onSaved();
  }, [event, isNew, remindMinutes, onSaved]);

  const handleDelete = useCallback(async () => {
    if (!event?.id) return;
    for (const rid of event.reminderIds) {
      await removeReminder(rid).catch(() => {});
    }
    await deleteCalendarEvent(event.id);
    onSaved();
  }, [event, onSaved]);

  const canSave = !!event && event.title.trim().length > 0;

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

  const applyDurationFromStart = (minutes: number) => {
    if (!event) return;
    const start = new Date(event.startAt);
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    setEvent((p) => (p ? { ...p, endAt: end.toISOString() } : null));
    setDurationMinutes(minutes);
  };

  const handleQuickStartOffset = (offsetMinutes: number) => {
    if (!event) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() + offsetMinutes, 0, 0);
    const baseDuration =
      durationMinutes === "custom"
        ? Math.max(
            15,
            Math.round(
              (new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) /
                (60 * 1000)
            )
          )
        : durationMinutes;
    const end = new Date(now.getTime() + baseDuration * 60 * 1000);
    setEvent((p) =>
      p
        ? {
            ...p,
            startAt: now.toISOString(),
            endAt: end.toISOString(),
          }
        : null
    );
  };

  const handleDatePreset = (days: number) => {
    if (!event) return;
    const base = new Date();
    base.setDate(base.getDate() + days);
    const nextStart = new Date(event.startAt);
    nextStart.setFullYear(base.getFullYear(), base.getMonth(), base.getDate());
    const diff = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
    const nextEnd = new Date(nextStart.getTime() + diff);
    setEvent((p) =>
      p
        ? {
            ...p,
            startAt: nextStart.toISOString(),
            endAt: nextEnd.toISOString(),
          }
        : null
    );
  };

  const handleTimeOfDayPreset = (hour: number) => {
    if (!event) return;
    const base = new Date(event.startAt);
    base.setHours(hour, 0, 0, 0);
    const diff = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
    const end = new Date(base.getTime() + diff);
    setEvent((p) =>
      p
        ? {
            ...p,
            startAt: base.toISOString(),
            endAt: end.toISOString(),
          }
        : null
    );
  };

  if (!event && !loading) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={isNew ? t("calendar.newEventModal") : t("calendar.editEventModal")}
    >
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
                  value={event!.title}
                  onChange={(e) =>
                    setEvent((p) => (p ? { ...p, title: e.target.value } : null))
                  }
                  placeholder={t("calendar.eventTitle")}
                />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-xs font-medium text-[var(--text-secondary)]">
                  {t("calendar.optionalNotes")}
                </span>
                <textarea
                  value={event!.notes ?? ""}
                  onChange={(e) =>
                    setEvent((p) => (p ? { ...p, notes: e.target.value } : null))
                  }
                  placeholder={t("calendar.optionalNotes")}
                  rows={3}
                  className={cn(
                    "w-full rounded-[var(--radius-control)] border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  )}
                />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-xs font-medium text-[var(--text-secondary)]">
                  {t("calendar.optionalLocation")}
                </span>
                <Input
                  value={event!.location ?? ""}
                  onChange={(e) =>
                    setEvent((p) => (p ? { ...p, location: e.target.value } : null))
                  }
                  placeholder={t("calendar.optionalLocation")}
                />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-xs font-medium text-[var(--text-secondary)]">
                  {t("reminders.linkNote")}
                </span>
                <Input
                  value={noteQuery}
                  onChange={(e) => setNoteQuery(e.target.value)}
                  placeholder={t("titlebar.searchPlaceholder")}
                  className="mb-1"
                />
                <Select
                  value={event!.linkedNoteId ?? ""}
                  onChange={(v) =>
                    setEvent((p) => (p ? { ...p, linkedNoteId: v || null } : null))
                  }
                  options={[
                    { value: "", label: t("reminders.none") },
                    ...filteredNotes.slice(0, 50).map((n) => ({
                      value: n.id,
                      label: n.title || t("notes.untitled"),
                    })),
                  ]}
                />
              </label>
            </div>
            <div className="space-y-4">
              <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-2)]/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    {t("calendar.when")}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {timeZoneLabel}
                  </span>
                </div>
                <Checkbox
                  checked={event!.allDay}
                  onChange={(e) =>
                    setEvent((p) => {
                      if (!p) return null;
                      const allDay = e.target.checked;
                      if (allDay) {
                        const start = new Date(p.startAt);
                        const end = new Date(p.endAt);
                        start.setHours(0, 0, 0, 0);
                        end.setHours(23, 59, 0, 0);
                        return {
                          ...p,
                          allDay: true,
                          startAt: start.toISOString(),
                          endAt: end.toISOString(),
                        };
                      }
                      return { ...p, allDay: false };
                    })
                  }
                  label={t("calendar.allDayLabel")}
                />
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] font-medium text-[var(--text-secondary)]">
                        {t("calendar.start")}
                      </span>
                      <div className="flex flex-col gap-1.5">
                        <DatePicker
                          value={new Date(event!.startAt)}
                          onChange={(d) => {
                            const prev = new Date(event!.startAt);
                            d.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                            setEvent((p) =>
                              p ? { ...p, startAt: d.toISOString() } : null
                            );
                          }}
                          className="w-full"
                        />
                        {!event!.allDay && (
                          <TimeField
                            value={{
                              hour: new Date(event!.startAt).getHours(),
                              minute:
                                new Date(event!.startAt).getMinutes() -
                                (new Date(event!.startAt).getMinutes() % 5),
                            }}
                            onChange={(v) => {
                              if (!v) return;
                              const d = new Date(event!.startAt);
                              d.setHours(v.hour, v.minute, 0, 0);
                              setEvent((p) =>
                                p ? { ...p, startAt: d.toISOString() } : null
                              );
                            }}
                            stepMinutes={5}
                          />
                        )}
                      </div>
                    </label>
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] font-medium text-[var(--text-secondary)]">
                        {t("calendar.end")}
                      </span>
                      <div className="flex flex-col gap-1.5">
                        <DatePicker
                          value={new Date(event!.endAt)}
                          onChange={(d) => {
                            const prev = new Date(event!.endAt);
                            d.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
                            setEvent((p) =>
                              p ? { ...p, endAt: d.toISOString() } : null
                            );
                          }}
                          className="w-full"
                        />
                        {!event!.allDay && (
                          <TimeField
                            value={{
                              hour: new Date(event!.endAt).getHours(),
                              minute:
                                new Date(event!.endAt).getMinutes() -
                                (new Date(event!.endAt).getMinutes() % 5),
                            }}
                            onChange={(v) => {
                              if (!v) return;
                              const d = new Date(event!.endAt);
                              d.setHours(v.hour, v.minute, 0, 0);
                              setEvent((p) =>
                                p ? { ...p, endAt: d.toISOString() } : null
                              );
                            }}
                            stepMinutes={5}
                          />
                        )}
                      </div>
                    </label>
                  </div>
                  {!event!.allDay && (
                    <>
                      <div className="relative z-10 flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          onClick={() => handleQuickStartOffset(0)}
                        >
                          {t("calendar.now")}
                        </button>
                        <button
                          type="button"
                          className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          onClick={() => handleQuickStartOffset(30)}
                        >
                          +30m
                        </button>
                        <button
                          type="button"
                          className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          onClick={() => handleQuickStartOffset(60)}
                        >
                          +1h
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-[var(--text-secondary)]">
                          {t("calendar.duration")}
                        </span>
                        <Select
                          value={durationMinutes === "custom" ? "custom" : String(durationMinutes)}
                          onChange={(v) => {
                            if (v === "custom") {
                              setDurationMinutes("custom");
                              return;
                            }
                            const minutes = Number(v);
                            applyDurationFromStart(minutes);
                          }}
                          options={[
                            { value: "15", label: t("calendar.min15") },
                            { value: "30", label: t("calendar.min30") },
                            { value: "45", label: t("calendar.min45") },
                            { value: "60", label: t("calendar.hour1") },
                            { value: "120", label: t("calendar.hours2") },
                            { value: "custom", label: t("calendar.custom") },
                          ]}
                          className="w-32"
                        />
                      </div>
                    </>
                  )}
                  <div className="relative z-10 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      onClick={() => handleDatePreset(0)}
                    >
                      {t("calendar.today")}
                    </button>
                    <button
                      type="button"
                      className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      onClick={() => handleDatePreset(1)}
                    >
                      {t("calendar.tomorrow")}
                    </button>
                    <button
                      type="button"
                      className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                      onClick={() => handleDatePreset(7)}
                    >
                      {t("calendar.nextWeek")}
                    </button>
                    {!event!.allDay && (
                      <>
                        <button
                          type="button"
                          className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          onClick={() => handleTimeOfDayPreset(9)}
                        >
                          {t("calendar.morning9")}
                        </button>
                        <button
                          type="button"
                          className="min-h-[32px] cursor-pointer touch-manipulation rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          onClick={() => handleTimeOfDayPreset(14)}
                        >
                          {t("calendar.afternoon14")}
                        </button>
                      </>
                    )}
                  </div>
                  {event!.allDay && (
                    <button
                      type="button"
                      className="self-start rounded-full border border-[var(--surface-border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                      onClick={() => {
                        const start = new Date(event!.startAt);
                        const end = new Date(start);
                        end.setHours(23, 59, 0, 0);
                        setEvent((p) =>
                          p ? { ...p, endAt: end.toISOString() } : null
                        );
                      }}
                    >
                      {t("calendar.sameDay")}
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface-2)]/40 p-3">
                <label className="block">
                  <span className="mb-0.5 block text-xs font-medium text-[var(--text-secondary)]">
                    {t("calendar.remindMe")}
                  </span>
                  <Select
                    value={remindMinutes !== null ? String(remindMinutes) : ""}
                    onChange={(v) => setRemindMinutes(v === "" ? null : Number(v))}
                    options={[
                      { value: "", label: t("reminders.none") },
                      ...REMIND_OFFSETS.map(({ labelKey, minutes }) => ({
                        value: String(minutes),
                        label: t(CALENDAR_REMIND_LABELS[labelKey]),
                      })),
                    ]}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="sticky bottom-0 mt-2 flex items-center justify-between gap-2 border-t border-[var(--surface-border)] px-1 pt-3">
            {!isNew ? (
              <Button
                variant="ghost"
                onClick={handleDelete}
                className="text-xs text-red-500 hover:bg-red-500/10"
              >
                {t("notes.delete")}
              </Button>
            ) : (
              <span className="text-[11px] text-[var(--text-secondary)]" />
            )}
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
