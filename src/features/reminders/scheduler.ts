import { loadReminders, updateReminder } from "./repository";
import { isTauri } from "@/lib/tauri";

const FALLBACK_MS = 60_000;
const MIN_MS = 1_000;
const MAX_MS = 60_000;

let timeoutId: ReturnType<typeof setTimeout> | null = null;

function getNextRemindAtMs(reminders: Awaited<ReturnType<typeof loadReminders>>): number | null {
  const now = Date.now();
  let next: number | null = null;
  for (const r of reminders) {
    if (r.completedAt || r.notificationFiredAt || !r.remindAt) continue;
    const t = new Date(r.remindAt).getTime();
    if (t <= now) continue;
    if (next === null || t < next) next = t;
  }
  return next;
}

function scheduleNext(delayMs: number): void {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(tick, delayMs);
}

async function tick(): Promise<void> {
  if (!isTauri()) return;
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      "@tauri-apps/plugin-notification"
    );
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
      if (!granted) {
        scheduleNext(FALLBACK_MS);
        return;
      }
    }
    const reminders = await loadReminders();
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    for (const r of reminders) {
      if (r.completedAt || r.notificationFiredAt || !r.remindAt) continue;
      const remindMs = new Date(r.remindAt).getTime();
      if (remindMs > nowMs) continue;
      sendNotification({
        title: r.title,
        body: r.notes ?? undefined,
      });
      await updateReminder(r.id, { notificationFiredAt: now });
      r.notificationFiredAt = now;
    }
    const nextAt = getNextRemindAtMs(reminders);
    const delay =
      nextAt === null
        ? FALLBACK_MS
        : Math.min(MAX_MS, Math.max(MIN_MS, nextAt - nowMs));
    scheduleNext(delay);
  } catch {
    scheduleNext(FALLBACK_MS);
  }
}

export function startReminderScheduler(): () => void {
  if (timeoutId) return () => {};
  tick();
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
}
