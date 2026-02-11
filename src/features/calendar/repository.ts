import { loadStore } from "@/lib/store";
import { v4 as uuid } from "uuid";
import type { CalendarEvent, CalendarViewPrefs } from "./types";
import {
  migrateCalendarEvents,
  migrateCalendarSettings,
  CALENDAR_EVENTS_STORE_VERSION,
  CALENDAR_SETTINGS_STORE_VERSION,
} from "./migrateCalendar";

const EVENTS_PATH = "events.json";
const CALENDAR_SETTINGS_PATH = "calendar_settings.json";

let eventsStore: Awaited<ReturnType<typeof loadStore>> | null = null;
let settingsStore: Awaited<ReturnType<typeof loadStore>> | null = null;

async function getEventsStore() {
  if (!eventsStore) {
    eventsStore = await loadStore(EVENTS_PATH, { autoSave: 400 });
  }
  return eventsStore;
}

async function getCalendarSettingsStore() {
  if (!settingsStore) {
    settingsStore = await loadStore(CALENDAR_SETTINGS_PATH, { autoSave: 400 });
  }
  return settingsStore;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export async function loadCalendarEvents(): Promise<CalendarEvent[]> {
  const s = await getEventsStore();
  const raw = await s.get<unknown>("data");
  const payload = isRecord(raw) ? raw : {};
  const version = typeof payload.version === "number" ? payload.version : 0;
  const list = migrateCalendarEvents(payload);
  if (version !== CALENDAR_EVENTS_STORE_VERSION) {
    await s.set("data", { version: CALENDAR_EVENTS_STORE_VERSION, events: list });
    await s.save();
  }
  return list;
}

async function saveCalendarEvents(events: CalendarEvent[]): Promise<void> {
  const s = await getEventsStore();
  await s.set("data", { version: CALENDAR_EVENTS_STORE_VERSION, events });
  await s.save();
}

export async function loadCalendarViewPrefs(): Promise<CalendarViewPrefs> {
  const s = await getCalendarSettingsStore();
  const raw = await s.get<unknown>("data");
  const payload = isRecord(raw) ? raw : {};
  const version = typeof payload.version === "number" ? payload.version : 0;
  const prefs = migrateCalendarSettings(payload);
  if (version !== CALENDAR_SETTINGS_STORE_VERSION) {
    await s.set("data", { version: CALENDAR_SETTINGS_STORE_VERSION, ...prefs });
    await s.save();
  }
  return prefs;
}

export async function saveCalendarViewPrefs(prefs: CalendarViewPrefs): Promise<void> {
  const s = await getCalendarSettingsStore();
  await s.set("data", { version: CALENDAR_SETTINGS_STORE_VERSION, ...prefs });
  await s.save();
}

export async function createCalendarEvent(
  patch: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">
): Promise<CalendarEvent> {
  const events = await loadCalendarEvents();
  const now = new Date().toISOString();
  const event: CalendarEvent = {
    ...patch,
    id: uuid(),
    createdAt: now,
    updatedAt: now,
  };
  events.push(event);
  await saveCalendarEvents(events);
  return event;
}

export async function updateCalendarEvent(
  id: string,
  patch: Partial<Omit<CalendarEvent, "id" | "createdAt">>
): Promise<CalendarEvent | null> {
  const events = await loadCalendarEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const updated = { ...events[idx], ...patch, updatedAt: new Date().toISOString() };
  events[idx] = updated;
  await saveCalendarEvents(events);
  return updated;
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const events = await loadCalendarEvents();
  const filtered = events.filter((e) => e.id !== id);
  if (filtered.length === events.length) return false;
  await saveCalendarEvents(filtered);
  return true;
}

export async function getCalendarEvent(id: string): Promise<CalendarEvent | null> {
  const events = await loadCalendarEvents();
  return events.find((e) => e.id === id) ?? null;
}
