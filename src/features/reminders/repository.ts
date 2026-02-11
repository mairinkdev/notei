import { loadStore } from "@/lib/store";
import { v4 as uuid } from "uuid";
import {
  startOfDay,
  endOfDay,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO,
} from "date-fns";
import type { Reminder, ReminderList, SmartFilterType, ListRemindersFilter } from "./types";
import {
  normalizeReminders,
  normalizeReminderLists,
  REMINDERS_STORE_VERSION,
  REMINDER_LISTS_STORE_VERSION,
} from "./migrateReminders";

const REMINDERS_PATH = "reminders.json";
const LISTS_PATH = "reminder_lists.json";

let remindersStore: Awaited<ReturnType<typeof loadStore>> | null = null;
let listsStore: Awaited<ReturnType<typeof loadStore>> | null = null;

async function getRemindersStore() {
  if (!remindersStore) {
    remindersStore = await loadStore(REMINDERS_PATH, { autoSave: 400 });
  }
  return remindersStore;
}

async function getListsStore() {
  if (!listsStore) {
    listsStore = await loadStore(LISTS_PATH, { autoSave: 400 });
  }
  return listsStore;
}

export async function loadReminders(): Promise<Reminder[]> {
  const s = await getRemindersStore();
  const raw = await s.get<{ version?: number; reminders?: unknown } | unknown>("data");
  const payload = isRecord(raw) ? raw : {};
  const version = typeof payload.version === "number" ? payload.version : 0;
  const list = normalizeReminders(raw);
  if (version !== REMINDERS_STORE_VERSION) {
    await s.set("data", { version: REMINDERS_STORE_VERSION, reminders: list });
    await s.save();
  }
  return list;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

async function saveReminders(reminders: Reminder[]): Promise<void> {
  const s = await getRemindersStore();
  await s.set("data", { version: REMINDERS_STORE_VERSION, reminders });
  await s.save();
}

async function loadLists(): Promise<ReminderList[]> {
  const s = await getListsStore();
  const raw = await s.get<{ version?: number; lists?: unknown } | unknown>("data");
  const payload = isRecord(raw) ? raw : {};
  const version = typeof payload.version === "number" ? payload.version : 0;
  const list = normalizeReminderLists(raw);
  if (version !== REMINDER_LISTS_STORE_VERSION) {
    await s.set("data", { version: REMINDER_LISTS_STORE_VERSION, lists: list });
    await s.save();
  }
  return list;
}

async function saveLists(lists: ReminderList[]): Promise<void> {
  const s = await getListsStore();
  await s.set("data", { version: REMINDER_LISTS_STORE_VERSION, lists });
  await s.save();
}

function getSortKey(items: { sortKey: number }[]): number {
  if (items.length === 0) return 0;
  return Math.max(...items.map((x) => x.sortKey), 0) + 1;
}

const DEFAULT_LIST_ID = "inbox";
const DEFAULT_LISTS: Omit<ReminderList, "createdAt" | "updatedAt">[] = [
  { id: "inbox", name: "Inbox", emoji: null, sortKey: 0 },
  { id: "meetings", name: "Meetings", emoji: null, sortKey: 1 },
  { id: "personal", name: "Personal", emoji: null, sortKey: 2 },
];

export async function listReminderLists(): Promise<ReminderList[]> {
  const lists = await loadLists();
  const now = new Date().toISOString();
  let changed = false;
  for (const def of DEFAULT_LISTS) {
    if (lists.some((l) => l.id === def.id)) continue;
    lists.push({
      ...def,
      createdAt: now,
      updatedAt: now,
    });
    changed = true;
  }
  if (changed) await saveLists(lists);
  return [...lists].sort((a, b) => a.sortKey - b.sortKey);
}

export async function createReminderList(
  name: string,
  emoji?: string | null
): Promise<ReminderList> {
  const lists = await loadLists();
  const now = new Date().toISOString();
  const list: ReminderList = {
    id: uuid(),
    name,
    emoji: emoji ?? null,
    createdAt: now,
    updatedAt: now,
    sortKey: getSortKey(lists),
  };
  lists.push(list);
  await saveLists(lists);
  return list;
}

export async function updateReminderList(
  id: string,
  patch: Partial<Pick<ReminderList, "name" | "emoji">>
): Promise<ReminderList | null> {
  const lists = await loadLists();
  const idx = lists.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  lists[idx] = {
    ...lists[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await saveLists(lists);
  return lists[idx];
}

export async function removeReminderList(id: string): Promise<boolean> {
  if (id === DEFAULT_LIST_ID) return false;
  const [lists, reminders] = await Promise.all([loadLists(), loadReminders()]);
  const listIdx = lists.findIndex((l) => l.id === id);
  if (listIdx === -1) return false;
  const nextLists = lists.filter((l) => l.id !== id);
  const inboxId = nextLists.find((l) => l.id === DEFAULT_LIST_ID)?.id ?? DEFAULT_LIST_ID;
  const nextReminders = reminders.map((r) =>
    r.listId === id ? { ...r, listId: inboxId, updatedAt: new Date().toISOString() } : r
  );
  await saveLists(nextLists);
  await saveReminders(nextReminders);
  return true;
}

export async function listReminders(filter: ListRemindersFilter = {}): Promise<Reminder[]> {
  let reminders = await loadReminders();
  if (filter.listId !== undefined) {
    reminders = reminders.filter((r) => r.listId === filter.listId);
  }
  if (filter.completed !== undefined) {
    reminders = reminders.filter((r) => (filter.completed ? r.completedAt : !r.completedAt));
  }
  reminders.sort((a, b) => a.sortKey - b.sortKey);
  return reminders;
}

function toDate(s: string | undefined): Date | null {
  if (!s) return null;
  try {
    return parseISO(s);
  } catch {
    return null;
  }
}

export async function listSmart(type: SmartFilterType): Promise<Reminder[]> {
  const reminders = await loadReminders();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (type) {
    case "today": {
      return reminders
        .filter((r) => !r.completedAt)
        .filter((r) => {
          const d = toDate(r.dueAt ?? r.remindAt);
          return d ? isWithinInterval(d, { start: todayStart, end: todayEnd }) : false;
        })
        .sort((a, b) => a.sortKey - b.sortKey);
    }
    case "scheduled": {
      return reminders
        .filter((r) => !r.completedAt)
        .filter((r) => {
          const d = toDate(r.dueAt ?? r.remindAt);
          return d ? isAfter(d, now) : false;
        })
        .sort((a, b) => {
          const da = toDate(a.dueAt ?? a.remindAt);
          const db = toDate(b.dueAt ?? b.remindAt);
          if (!da || !db) return a.sortKey - b.sortKey;
          return da.getTime() - db.getTime();
        });
    }
    case "overdue": {
      return reminders
        .filter((r) => !r.completedAt)
        .filter((r) => {
          const d = toDate(r.dueAt ?? r.remindAt);
          return d ? isBefore(d, now) : false;
        })
        .sort((a, b) => a.sortKey - b.sortKey);
    }
    case "completed": {
      return reminders
        .filter((r) => r.completedAt)
        .sort((a, b) => {
          const ta = a.completedAt ? parseISO(a.completedAt).getTime() : 0;
          const tb = b.completedAt ? parseISO(b.completedAt).getTime() : 0;
          return tb - ta;
        });
    }
    default: {
      return reminders.filter((r) => !r.completedAt).sort((a, b) => a.sortKey - b.sortKey);
    }
  }
}

export async function getReminder(id: string): Promise<Reminder | null> {
  const reminders = await loadReminders();
  return reminders.find((r) => r.id === id) ?? null;
}

export async function createReminder(
  listId: string,
  title: string,
  opts?: Partial<Pick<Reminder, "notes" | "dueAt" | "remindAt" | "repeat" | "priority" | "linkedNoteId">>
): Promise<Reminder> {
  const reminders = await loadReminders();
  const now = new Date().toISOString();
  const reminder: Reminder = {
    id: uuid(),
    listId,
    title,
    notes: opts?.notes,
    linkedNoteId: opts?.linkedNoteId,
    dueAt: opts?.dueAt,
    remindAt: opts?.remindAt,
    repeat: opts?.repeat ?? null,
    priority: opts?.priority ?? "none",
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    sortKey: getSortKey(reminders),
  };
  reminders.push(reminder);
  await saveReminders(reminders);
  return reminder;
}

export async function updateReminder(
  id: string,
  patch: Partial<Omit<Reminder, "id" | "createdAt">>
): Promise<Reminder | null> {
  const reminders = await loadReminders();
  const idx = reminders.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const next = { ...reminders[idx], ...patch, updatedAt: new Date().toISOString() };
  if (patch.remindAt !== undefined && patch.remindAt !== reminders[idx].remindAt) {
    next.notificationFiredAt = null;
  }
  reminders[idx] = next;
  await saveReminders(reminders);
  return reminders[idx];
}

export async function completeReminder(id: string): Promise<Reminder | null> {
  return updateReminder(id, { completedAt: new Date().toISOString() });
}

export async function uncompleteReminder(id: string): Promise<Reminder | null> {
  return updateReminder(id, { completedAt: null });
}

const SNOOZE_PRESETS: Record<string, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

export async function snoozeReminder(
  id: string,
  preset: keyof typeof SNOOZE_PRESETS
): Promise<Reminder | null> {
  const r = await getReminder(id);
  if (!r) return null;
  const ms = SNOOZE_PRESETS[preset] ?? SNOOZE_PRESETS["1h"];
  const next = new Date(Date.now() + ms).toISOString();
  return updateReminder(id, { remindAt: next, dueAt: r.dueAt ?? next });
}

export async function removeReminder(id: string): Promise<boolean> {
  const reminders = await loadReminders();
  const next = reminders.filter((r) => r.id !== id);
  if (next.length === reminders.length) return false;
  await saveReminders(next);
  return true;
}

export function rescheduleRecurringNext(reminder: Reminder): Reminder | null {
  if (!reminder.repeat || reminder.completedAt) return null;
  const from = toDate(reminder.dueAt ?? reminder.remindAt) ?? new Date();
  let next: Date;
  const { freq, interval } = reminder.repeat;
  switch (freq) {
    case "daily":
      next = new Date(from);
      next.setDate(next.getDate() + interval);
      break;
    case "weekly":
      next = new Date(from);
      next.setDate(next.getDate() + 7 * interval);
      break;
    case "monthly":
      next = new Date(from);
      next.setMonth(next.getMonth() + interval);
      break;
    case "yearly":
      next = new Date(from);
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      next = new Date(from);
      next.setDate(next.getDate() + 1);
  }
  if (reminder.repeat.endAt && isAfter(next, parseISO(reminder.repeat.endAt))) return null;
  return {
    ...reminder,
    id: uuid(),
    dueAt: reminder.dueAt ? next.toISOString() : undefined,
    remindAt: reminder.remindAt ? next.toISOString() : undefined,
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sortKey: reminder.sortKey,
  };
}
