import type { CalendarEvent } from "./types";

export type EventWithLayout = {
  event: CalendarEvent;
  columnIndex: number;
  totalColumns: number;
};

function overlaps(a: CalendarEvent, b: CalendarEvent): boolean {
  const aStart = new Date(a.startAt).getTime();
  const aEnd = new Date(a.endAt).getTime();
  const bStart = new Date(b.startAt).getTime();
  const bEnd = new Date(b.endAt).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function layoutOverlappingEvents(events: CalendarEvent[]): EventWithLayout[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
  const result: EventWithLayout[] = [];
  const columns: CalendarEvent[][] = [];

  for (const ev of sorted) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const conflict = columns[c].some((existing) => overlaps(existing, ev));
      if (!conflict) {
        columns[c].push(ev);
        result.push({ event: ev, columnIndex: c, totalColumns: columns.length });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([ev]);
      result.push({
        event: ev,
        columnIndex: columns.length - 1,
        totalColumns: columns.length,
      });
    }
  }

  const maxCols = columns.length;
  return result.map((r) => ({
    ...r,
    totalColumns: maxCols,
  }));
}

const SLOT_MINUTES = 15;
const MIN_DURATION_MINUTES = 30;

export function snapToSlot(minutesFromDayStart: number): number {
  const slot = Math.round(minutesFromDayStart / SLOT_MINUTES) * SLOT_MINUTES;
  return Math.max(0, slot);
}

export function clampDurationMinutes(startSlot: number, endSlot: number): number {
  const raw = endSlot - startSlot;
  const duration = Math.max(raw, MIN_DURATION_MINUTES / SLOT_MINUTES);
  return snapToSlot(duration * SLOT_MINUTES);
}

export function slotToMinutes(slotIndex: number): number {
  return slotIndex * SLOT_MINUTES;
}

export function minutesToDate(day: Date, dayStartHour: number, minutesFromStart: number): Date {
  const d = new Date(day);
  d.setHours(dayStartHour, 0, 0, 0);
  d.setMinutes(d.getMinutes() + minutesFromStart);
  return d;
}

export function dateToSlotMinutes(date: Date, dayStartHour: number): number {
  const d = new Date(date);
  const start = new Date(d);
  start.setHours(dayStartHour, 0, 0, 0);
  const mins = (d.getTime() - start.getTime()) / (60 * 1000);
  return Math.max(0, mins);
}

export const PIXELS_PER_SLOT = 12;
