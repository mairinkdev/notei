import type { CalendarEvent, CalendarViewPrefs } from "./types";
import { DEFAULT_CALENDAR_VIEW_PREFS } from "./types";

export const CALENDAR_EVENTS_STORE_VERSION = 1;
export const CALENDAR_SETTINGS_STORE_VERSION = 1;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function ensureEvent(raw: unknown): CalendarEvent | null {
  const o = isRecord(raw) ? raw : {};
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const title = typeof o.title === "string" ? o.title : "";
  const notes = typeof o.notes === "string" ? o.notes : undefined;
  const location = typeof o.location === "string" ? o.location : undefined;
  const startAt = typeof o.startAt === "string" ? o.startAt : "";
  const endAt = typeof o.endAt === "string" ? o.endAt : "";
  const allDay = o.allDay === true;
  const timezone = typeof o.timezone === "string" ? o.timezone : undefined;
  const reminderIds = Array.isArray(o.reminderIds)
    ? (o.reminderIds as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const linkedNoteId = o.linkedNoteId === null || typeof o.linkedNoteId === "string" ? o.linkedNoteId : undefined;
  const participants = Array.isArray(o.participants)
    ? (o.participants as unknown[]).filter((x): x is string => typeof x === "string")
    : undefined;
  const color = o.color === null || typeof o.color === "string" ? o.color : undefined;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : createdAt;
  const recurrence = isRecord(o.recurrence) ? o.recurrence : undefined;
  return {
    id,
    title,
    notes,
    location,
    startAt,
    endAt,
    allDay,
    timezone,
    reminderIds,
    linkedNoteId: linkedNoteId ?? null,
    participants,
    color: color ?? null,
    createdAt,
    updatedAt,
    recurrence,
  };
}

export function migrateCalendarEvents(raw: unknown): CalendarEvent[] {
  const data = isRecord(raw) && raw.events !== undefined ? raw : { events: raw };
  const arr = Array.isArray(data.events)
    ? data.events
    : isRecord(data) && Array.isArray((data as Record<string, unknown>).events)
      ? ((data as Record<string, unknown>).events as unknown[])
      : [];
  const out: CalendarEvent[] = [];
  for (const item of arr) {
    const e = ensureEvent(item);
    if (e) out.push(e);
  }
  return out;
}

export function migrateCalendarSettings(raw: unknown): CalendarViewPrefs {
  const o = isRecord(raw) ? raw : {};
  const defaultView =
    o.defaultView === "month" || o.defaultView === "week" || o.defaultView === "day" || o.defaultView === "agenda"
      ? o.defaultView
      : DEFAULT_CALENDAR_VIEW_PREFS.defaultView;
  const weekStartsOn = o.weekStartsOn === 1 ? 1 : 0;
  const showWeekNumbers = typeof o.showWeekNumbers === "boolean" ? o.showWeekNumbers : DEFAULT_CALENDAR_VIEW_PREFS.showWeekNumbers;
  const dayStartHour = typeof o.dayStartHour === "number" && o.dayStartHour >= 0 && o.dayStartHour <= 23 ? o.dayStartHour : DEFAULT_CALENDAR_VIEW_PREFS.dayStartHour;
  const dayEndHour = typeof o.dayEndHour === "number" && o.dayEndHour >= 0 && o.dayEndHour <= 24 ? o.dayEndHour : DEFAULT_CALENDAR_VIEW_PREFS.dayEndHour;
  return {
    defaultView,
    weekStartsOn,
    showWeekNumbers,
    dayStartHour,
    dayEndHour,
  };
}
