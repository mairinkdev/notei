import type { Reminder, ReminderList } from "./types";

export const REMINDERS_STORE_VERSION = 1;
export const REMINDER_LISTS_STORE_VERSION = 1;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function ensureReminder(raw: unknown): Reminder | null {
  const o = isRecord(raw) ? raw : {};
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const listId = typeof o.listId === "string" ? o.listId : "";
  const title = typeof o.title === "string" ? o.title : "";
  const notes = typeof o.notes === "string" ? o.notes : undefined;
  const linkedNoteId = typeof o.linkedNoteId === "string" ? o.linkedNoteId : undefined;
  const dueAt = typeof o.dueAt === "string" ? o.dueAt : undefined;
  const remindAt = typeof o.remindAt === "string" ? o.remindAt : undefined;
  const priority = o.priority === "low" || o.priority === "medium" || o.priority === "high" ? o.priority : "none";
  const completedAt = o.completedAt === null || typeof o.completedAt === "string" ? o.completedAt : undefined;
  const notificationFiredAt = o.notificationFiredAt === null || typeof o.notificationFiredAt === "string" ? o.notificationFiredAt : undefined;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : createdAt;
  const sortKey = typeof o.sortKey === "number" ? o.sortKey : 0;
  let repeat: Reminder["repeat"] = null;
  if (isRecord(o.repeat)) {
    const r = o.repeat;
    const freq = r.freq === "daily" || r.freq === "weekly" || r.freq === "monthly" || r.freq === "yearly" || r.freq === "custom" ? r.freq : "daily";
    const interval = typeof r.interval === "number" ? r.interval : 1;
    const byWeekday = Array.isArray(r.byWeekday) ? r.byWeekday.filter((x): x is number => typeof x === "number") : undefined;
    const endAt = typeof r.endAt === "string" ? r.endAt : undefined;
    repeat = { freq, interval, byWeekday, endAt };
  }
  return {
    id,
    listId,
    title,
    notes,
    linkedNoteId,
    dueAt,
    remindAt,
    repeat,
    priority,
    completedAt,
    notificationFiredAt,
    createdAt,
    updatedAt,
    sortKey,
  };
}

function ensureList(raw: unknown): ReminderList | null {
  const o = isRecord(raw) ? raw : {};
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const name = typeof o.name === "string" ? o.name : "";
  const emoji = o.emoji === null || typeof o.emoji === "string" ? o.emoji : undefined;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : createdAt;
  const sortKey = typeof o.sortKey === "number" ? o.sortKey : 0;
  return { id, name, emoji, createdAt, updatedAt, sortKey };
}

export function normalizeReminders(raw: unknown): Reminder[] {
  const data = isRecord(raw) && typeof raw.data === "object" && raw.data !== null ? raw.data : raw;
  const arr = Array.isArray(data) ? data : isRecord(data) && Array.isArray((data as Record<string, unknown>).reminders)
    ? ((data as Record<string, unknown>).reminders as unknown[])
    : [];
  const out: Reminder[] = [];
  for (const item of arr) {
    const r = ensureReminder(item);
    if (r) out.push(r);
  }
  return out;
}

export function normalizeReminderLists(raw: unknown): ReminderList[] {
  const data = isRecord(raw) && typeof raw.data === "object" && raw.data !== null ? raw.data : raw;
  const arr = Array.isArray(data) ? data : isRecord(data) && Array.isArray((data as Record<string, unknown>).lists)
    ? ((data as Record<string, unknown>).lists as unknown[])
    : [];
  const out: ReminderList[] = [];
  for (const item of arr) {
    const l = ensureList(item);
    if (l) out.push(l);
  }
  return out;
}
