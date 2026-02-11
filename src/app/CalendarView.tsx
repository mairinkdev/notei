import { useState, useEffect, useCallback, useRef } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addDays,
  subDays,
  format,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  isToday,
  isFuture,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Download, Upload } from "lucide-react";
import { loadCalendarEvents, loadCalendarViewPrefs, saveCalendarViewPrefs, createCalendarEvent } from "@/features/calendar/repository";
import type { CalendarEvent, CalendarViewType } from "@/features/calendar/types";
import { layoutOverlappingEvents, snapToSlot, slotToMinutes, minutesToDate, dateToSlotMinutes, PIXELS_PER_SLOT } from "@/features/calendar/layout";
import { eventsToIcs, parseIcs } from "@/features/calendar/ics";
import { CalendarEventModal } from "@/app/CalendarEventModal";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";
import { isTauri } from "@/lib/tauri";
import { t } from "@/strings/t";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_MINUTES = 15;
const MIN_DURATION_SLOTS = 2;

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = endOfDay(day).getTime();
  return events.filter((e) => {
    const start = new Date(e.startAt).getTime();
    const end = new Date(e.endAt).getTime();
    return start < dayEnd && end > dayStart;
  });
}

function getEventsForRange(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const start = rangeStart.getTime();
  const end = rangeEnd.getTime();
  return events.filter((e) => {
    const es = new Date(e.startAt).getTime();
    const ee = new Date(e.endAt).getTime();
    return es < end && ee > start;
  });
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [prefs, setPrefs] = useState<{
    defaultView: CalendarViewType;
    weekStartsOn: 0 | 1;
    showWeekNumbers: boolean;
    dayStartHour: number;
    dayEndHour: number;
  } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [modalNewOpen, setModalNewOpen] = useState(false);
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [initialEndDate, setInitialEndDate] = useState<Date | null>(null);
  const [dragRange, setDragRange] = useState<{ start: Date; end: Date; dayIndex: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    loadCalendarEvents().then(setEvents);
  }, []);

  useEffect(() => {
    loadCalendarViewPrefs().then((p) => {
      setPrefs(p);
      setView(p.defaultView);
    });
    refresh();
  }, [refresh]);

  const setViewAndSave = useCallback((v: CalendarViewType) => {
    setView(v);
    setPrefs((p) => {
      if (p) saveCalendarViewPrefs({ ...p, defaultView: v }).catch(() => {});
      return p;
    });
  }, []);

  const weekStartsOn = prefs?.weekStartsOn ?? 0;
  const dayLabels = weekStartsOn === 1 ? WEEKDAY_LABELS_MON : WEEKDAY_LABELS;

  const handlePrev = useCallback(() => {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    if (view === "week" || view === "day") setCurrentDate((d) => subDays(d, 1));
    if (view === "agenda") setCurrentDate((d) => subDays(d, 7));
  }, [view]);

  const handleNext = useCallback(() => {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    if (view === "week" || view === "day") setCurrentDate((d) => addDays(d, 1));
    if (view === "agenda") setCurrentDate((d) => addDays(d, 7));
  }, [view]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const openNewEvent = useCallback((date?: Date, endDate?: Date) => {
    setInitialDate(date ?? new Date());
    setInitialEndDate(endDate ?? null);
    setSelectedEventId(null);
    setModalNewOpen(true);
  }, []);

  const dayStartHour = prefs?.dayStartHour ?? 6;
  const dayEndHour = prefs?.dayEndHour ?? 22;
  const hourSlots = dayEndHour - dayStartHour;
  const totalSlots = hourSlots * (60 / SLOT_MINUTES);
  const hoursArray = Array.from({ length: hourSlots }, (_, i) => dayStartHour + i);

  const openEditEvent = useCallback((id: string) => {
    setSelectedEventId(id);
    setModalNewOpen(false);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedEventId(null);
    setModalNewOpen(false);
    refresh();
  }, [refresh]);

  const handleExportIcs = useCallback(async () => {
    if (!isTauri() || events.length === 0) return;
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await save({
      defaultPath: `notei_calendar_${format(new Date(), "yyyyMMdd")}.ics`,
      filters: [{ name: "iCalendar", extensions: ["ics"] }],
    });
    if (!filePath) return;
    await writeTextFile(filePath, eventsToIcs(events));
    refresh();
  }, [events, refresh]);

  const handleImportIcs = useCallback(async () => {
    if (!isTauri()) return;
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await open({
      directory: false,
      multiple: false,
      filters: [{ name: "iCalendar", extensions: ["ics"] }],
    });
    if (!filePath || typeof filePath !== "string") return;
    const text = await readTextFile(filePath);
    const parsed = parseIcs(text);
    for (const p of parsed) {
      await createCalendarEvent({
        title: p.summary,
        notes: p.description,
        location: p.location,
        startAt: p.startAt,
        endAt: p.endAt,
        allDay: p.allDay,
        reminderIds: [],
        linkedNoteId: null,
      });
    }
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDragRange(null);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        const target = document.activeElement as HTMLElement | null;
        if (target?.closest?.("[contenteditable=true]") || target?.closest?.(".ProseMirror")) return;
        e.preventDefault();
        openNewEvent();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openNewEvent]);

  useEffect(() => {
    const handler = () => openNewEvent();
    window.addEventListener("notei:new-event", handler);
    return () => window.removeEventListener("notei:new-event", handler);
  }, [openNewEvent]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn }) });

  const getSlotFromClientY = useCallback(
    (clientY: number): number => {
      const el = gridRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const relativeY = clientY - rect.top + el.scrollTop;
      const slot = Math.floor(relativeY / PIXELS_PER_SLOT);
      return Math.max(0, Math.min(slot, totalSlots - 1));
    },
    [totalSlots]
  );

  const handleTimeGridPointerDown = useCallback(
    (e: React.PointerEvent, dayIndex: number) => {
      if (e.button !== 0) return;
      const slot = getSlotFromClientY(e.clientY);
      const minutes = snapToSlot(slotToMinutes(slot));
      const baseDay = view === "day" ? currentDate : addDays(weekStart, dayIndex);
      const start = minutesToDate(baseDay, dayStartHour, minutes);
      const end = minutesToDate(baseDay, dayStartHour, minutes + SLOT_MINUTES * MIN_DURATION_SLOTS);
      setDragRange({ start, end, dayIndex });
      gridRef.current?.setPointerCapture?.(e.pointerId);
    },
    [view, currentDate, weekStart, dayStartHour, getSlotFromClientY]
  );

  const handleTimeGridPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRange) return;
      const slot = getSlotFromClientY(e.clientY);
      const baseDay = view === "day" ? currentDate : addDays(weekStart, dragRange.dayIndex);
      const startMinutes = dateToSlotMinutes(dragRange.start, dayStartHour);
      const rawEndMinutes = slotToMinutes(slot + 1);
      const endMinutes = rawEndMinutes <= startMinutes + SLOT_MINUTES * MIN_DURATION_SLOTS
        ? startMinutes + SLOT_MINUTES * MIN_DURATION_SLOTS
        : snapToSlot(rawEndMinutes - startMinutes) + startMinutes;
      const start = minutesToDate(baseDay, dayStartHour, startMinutes);
      const end = minutesToDate(baseDay, dayStartHour, Math.min(endMinutes, hourSlots * 60));
      setDragRange((prev) => prev ? { ...prev, start, end } : null);
    },
    [dragRange, view, currentDate, weekStart, dayStartHour, hourSlots, getSlotFromClientY]
  );

  const handleTimeGridPointerUp = useCallback(
    (e: React.PointerEvent) => {
      gridRef.current?.releasePointerCapture?.(e.pointerId);
      if (!dragRange) return;
      const durationMs = dragRange.end.getTime() - dragRange.start.getTime();
      if (durationMs >= (SLOT_MINUTES * MIN_DURATION_SLOTS) * 60 * 1000) {
        openNewEvent(dragRange.start, dragRange.end);
      }
      setDragRange(null);
    },
    [dragRange, openNewEvent]
  );

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const dayStart = startOfDay(currentDate);
  const dayEnd = endOfDay(currentDate);
  const dayEvents = getEventsForRange(events, dayStart, dayEnd);

  const agendaStart = startOfDay(currentDate);
  const agendaEnd = addDays(agendaStart, 14);
  const agendaEvents = getEventsForRange(events, agendaStart, agendaEnd).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
  const todayAgenda = agendaEvents.filter((e) => isSameDay(parseISO(e.startAt), currentDate));
  const tomorrowAgenda = agendaEvents.filter((e) => isSameDay(parseISO(e.startAt), addDays(currentDate, 1)));
  const next7Agenda = agendaEvents.filter((e) => {
    const d = parseISO(e.startAt);
    return !isSameDay(d, currentDate) && !isSameDay(d, addDays(currentDate, 1)) && isWithinInterval(d, { start: currentDate, end: addDays(currentDate, 7) });
  });
  const laterAgenda = agendaEvents.filter((e) => isFuture(parseISO(e.startAt)) && !isWithinInterval(parseISO(e.startAt), { start: currentDate, end: addDays(currentDate, 7) }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg)]">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--surface-border)] bg-[var(--surface)]/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-1">
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={handlePrev} aria-label={t("calendar.previous")}>
            <ChevronLeft size={18} />
          </Button>
          <Button variant="ghost" className="h-8 w-8 p-0" onClick={handleNext} aria-label={t("calendar.next")}>
            <ChevronRight size={18} />
          </Button>
          <Button variant="ghost" className="text-sm" onClick={handleToday}>
            {t("calendar.today")}
          </Button>
        </div>
        <h2 className="min-w-[180px] text-lg font-medium text-[var(--text)]">
          {view === "month" && format(currentDate, "MMMM yyyy")}
          {view === "week" && `${t("calendar.weekOf")} ${format(weekStart, "MMM d")}`}
          {view === "day" && format(currentDate, "EEEE, MMM d")}
          {view === "agenda" && t("calendar.agenda")}
        </h2>
        <div className="flex flex-1 justify-end gap-1">
          {(["month", "week", "day", "agenda"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewAndSave(v)}
              className={cn(
                "rounded-[var(--radius-chip)] px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                view === v
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text)] dark:hover:bg-white/5"
              )}
            >
              {v}
            </button>
          ))}
          {isTauri() && (
            <>
              <Button variant="ghost" className="gap-1.5" onClick={handleImportIcs}>
                <Upload size={16} />
                {t("calendar.importIcs")}
              </Button>
              <Button variant="ghost" className="gap-1.5" onClick={handleExportIcs} disabled={events.length === 0}>
                <Download size={16} />
                {t("calendar.exportIcs")}
              </Button>
            </>
          )}
          <Button className="gap-1.5" onClick={() => openNewEvent()}>
            <Plus size={16} />
            {t("calendar.newEvent")}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {view === "month" && (
          <div className="grid h-full min-h-[400px] grid-rows-[auto_1fr] gap-0 rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)]">
            <div className="grid grid-cols-7 border-b border-[var(--surface-border)]">
              {dayLabels.map((label) => (
                <div
                  key={label}
                  className="border-r border-[var(--surface-border)] py-2 text-center text-xs font-medium text-[var(--text-secondary)] last:border-r-0"
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-6">
              {monthDays.map((day) => {
                const dayEventsList = getEventsForDay(events, day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                return (
                  <div
                    key={day.toISOString()}
                    className="flex flex-col border-r border-b border-[var(--surface-border)] p-1 last:border-r-0"
                  >
                    <button
                      type="button"
                      onClick={() => openNewEvent(day)}
                      className={cn(
                        "mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm",
                        isCurrentMonth ? "text-[var(--text)]" : "text-[var(--text-secondary)]/60",
                        isToday(day) && "bg-[var(--accent)] font-medium text-white"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                    <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                      {dayEventsList.slice(0, 3).map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditEvent(ev.id);
                          }}
                          className="w-full truncate rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-left text-xs text-[var(--text)] hover:bg-black/10 dark:hover:bg-white/10"
                          title={ev.title}
                        >
                          {ev.title}
                        </button>
                      ))}
                      {dayEventsList.length > 3 && (
                        <span className="block truncate px-1.5 text-xs text-[var(--text-secondary)]">
                          +{dayEventsList.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "week" && (
          <div
            ref={gridRef}
            className="relative min-h-0 overflow-auto rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)]"
            onPointerMove={dragRange ? handleTimeGridPointerMove : undefined}
            onPointerUp={dragRange ? handleTimeGridPointerUp : undefined}
            onPointerLeave={dragRange ? handleTimeGridPointerUp : undefined}
            style={{ minHeight: totalSlots * PIXELS_PER_SLOT + 40 }}
          >
            <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-0">
              <div className="sticky top-0 z-10 border-r border-b border-[var(--surface-border)] bg-[var(--surface)]" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="sticky top-0 z-10 border-r border-[var(--surface-border)] py-2 text-center text-sm font-medium text-[var(--text)] last:border-r-0 bg-[var(--surface)]"
                >
                  {format(day, "EEE d")}
                </div>
              ))}
              {hoursArray.map((h) => (
                <div key={`t-${h}`} className="contents">
                  <div className="border-r border-t border-[var(--surface-border)] pr-1 pt-0.5 text-right text-xs text-[var(--text-secondary)]" style={{ height: PIXELS_PER_SLOT * 4 }}>
                    {h}:00
                  </div>
                  {weekDays.map((day, dayIndex) => (
                    <div
                      key={`${day.toISOString()}-${h}`}
                      className="relative border-r border-t border-[var(--surface-border)] last:border-r-0"
                      style={{ height: PIXELS_PER_SLOT * 4 }}
                      onPointerDown={(e) => handleTimeGridPointerDown(e, dayIndex)}
                    />
                  ))}
                </div>
              ))}
            </div>
            {weekDays.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(events, day);
              const laid = layoutOverlappingEvents(dayEvents);
              return (
                <div
                  key={day.toISOString()}
                  className="absolute top-[40px] left-0 pointer-events-none"
                  style={{
                    left: `calc(60px + (100% - 60px) / 7 * ${dayIndex})`,
                    width: "calc((100% - 60px) / 7)",
                    height: totalSlots * PIXELS_PER_SLOT,
                  }}
                >
                  {laid.map(({ event: ev, columnIndex, totalColumns }) => {
                    const start = new Date(ev.startAt);
                    const end = new Date(ev.endAt);
                    const startMinutes = snapToSlot(dateToSlotMinutes(start, dayStartHour));
                    const topPx = (startMinutes / SLOT_MINUTES) * PIXELS_PER_SLOT;
                    const heightPx = Math.max(24, (end.getTime() - start.getTime()) / (60 * 1000) / SLOT_MINUTES * PIXELS_PER_SLOT);
                    return (
                      <Tooltip key={ev.id} content={ev.title}>
                        <button
                          type="button"
                          onClick={() => openEditEvent(ev.id)}
                          className="absolute left-0.5 right-0.5 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-left text-xs text-[var(--text)] hover:bg-black/10 dark:hover:bg-white/10 truncate border border-[var(--surface-border)] pointer-events-auto"
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            width: `calc(${100 / totalColumns}% - 4px)`,
                            left: `calc(${(columnIndex / totalColumns) * 100}% + 2px)`,
                          }}
                        >
                          {ev.title}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
            <AnimatePresence>
              {dragRange && view === "week" && (
                <motion.div
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute left-[60px] rounded border border-[var(--surface-border)] bg-[var(--surface-2)]/80 backdrop-blur-sm"
                  style={{
                    top: dateToSlotMinutes(dragRange.start, dayStartHour) / SLOT_MINUTES * PIXELS_PER_SLOT + 40,
                    height: Math.max(MIN_DURATION_SLOTS * PIXELS_PER_SLOT, (dragRange.end.getTime() - dragRange.start.getTime()) / (60 * 1000) / SLOT_MINUTES * PIXELS_PER_SLOT),
                    width: "calc((100% - 60px) / 7)",
                    transform: `translateX(${dragRange.dayIndex * 100}%)`,
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {view === "day" && (
          <div
            ref={gridRef}
            className="relative min-h-0 overflow-auto rounded-[var(--radius-card)] border border-[var(--surface-border)] bg-[var(--surface)]"
            onPointerMove={dragRange ? handleTimeGridPointerMove : undefined}
            onPointerUp={dragRange ? handleTimeGridPointerUp : undefined}
            onPointerLeave={dragRange ? handleTimeGridPointerUp : undefined}
            style={{ minHeight: totalSlots * PIXELS_PER_SLOT + 40 }}
          >
            <div className="grid grid-cols-[60px_1fr]">
              {hoursArray.map((h) => (
                <div key={h} className="contents">
                  <div className="border-r border-t border-[var(--surface-border)] py-1 pr-1 text-right text-xs text-[var(--text-secondary)]" style={{ height: PIXELS_PER_SLOT * 4 }}>
                    {h}:00
                  </div>
                  <div
                    className="relative border-t border-[var(--surface-border)]"
                    style={{ height: PIXELS_PER_SLOT * 4 }}
                    onPointerDown={(e) => handleTimeGridPointerDown(e, 0)}
                  />
                </div>
              ))}
            </div>
            <div className="absolute left-[60px] right-0 top-[40px] bottom-0">
              {layoutOverlappingEvents(dayEvents).map(({ event: ev, columnIndex, totalColumns }) => {
                const start = new Date(ev.startAt);
                const end = new Date(ev.endAt);
                const startMinutes = snapToSlot(dateToSlotMinutes(start, dayStartHour));
                const topPx = (startMinutes / SLOT_MINUTES) * PIXELS_PER_SLOT;
                const heightPx = Math.max(24, (end.getTime() - start.getTime()) / (60 * 1000) / SLOT_MINUTES * PIXELS_PER_SLOT);
                return (
                  <Tooltip key={ev.id} content={ev.title}>
                    <button
                      type="button"
                      onClick={() => openEditEvent(ev.id)}
                      className="absolute left-0.5 right-0.5 rounded bg-[var(--surface-2)] border border-[var(--surface-border)] px-2 py-1 text-left text-sm text-[var(--text)] hover:bg-black/10 dark:hover:bg-white/10 truncate"
                      style={{
                        top: `${topPx}px`,
                        height: `${heightPx}px`,
                        width: `calc(${100 / totalColumns}% - 4px)`,
                        left: `calc(${(columnIndex / totalColumns) * 100}% + 2px)`,
                      }}
                    >
                      {format(start, "HH:mm")} {ev.title}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <AnimatePresence>
              {dragRange && view === "day" && (
                <motion.div
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute left-[60px] right-0 rounded border border-[var(--surface-border)] bg-[var(--surface-2)]/80 backdrop-blur-sm"
                  style={{
                    top: 40 + dateToSlotMinutes(dragRange.start, dayStartHour) / SLOT_MINUTES * PIXELS_PER_SLOT,
                    height: Math.max(MIN_DURATION_SLOTS * PIXELS_PER_SLOT, (dragRange.end.getTime() - dragRange.start.getTime()) / (60 * 1000) / SLOT_MINUTES * PIXELS_PER_SLOT),
                  }}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {view === "agenda" && (
          <div className="space-y-6">
            <AgendaGroup title={t("calendar.today")} events={todayAgenda} onEvent={openEditEvent} />
            <AgendaGroup title={t("calendar.tomorrow")} events={tomorrowAgenda} onEvent={openEditEvent} />
            <AgendaGroup title={t("calendar.next7Days")} events={next7Agenda} onEvent={openEditEvent} />
            <AgendaGroup title={t("calendar.later")} events={laterAgenda} onEvent={openEditEvent} />
          </div>
        )}
      </div>

      {(modalNewOpen || selectedEventId) && (
        <CalendarEventModal
          eventId={selectedEventId}
          initialDate={initialDate ?? undefined}
          initialEndDate={initialEndDate ?? undefined}
          onClose={closeModal}
          onSaved={closeModal}
        />
      )}
    </div>
  );
}

function AgendaGroup({
  title,
  events,
  onEvent,
}: {
  title: string;
  events: CalendarEvent[];
  onEvent: (id: string) => void;
}) {
  if (events.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">{title}</h3>
      <ul className="space-y-1">
        {events.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => onEvent(ev.id)}
              className="flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span className="shrink-0 text-[var(--text-secondary)]">
                {ev.allDay ? t("calendar.allDay") : format(parseISO(ev.startAt), "HH:mm")}
              </span>
              <span className="min-w-0 truncate font-medium">{ev.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
