import { addDays, addHours, addMinutes, addWeeks, setHours, setMinutes, startOfDay } from "date-fns";

export type QuickAddResult = {
  title: string;
  dueAt?: string;
  remindAt?: string;
};

const TIME_RE = /\b(\d{1,2}):(\d{2})\b/;
const IN_RE = /\bin\s*(\d+)\s*(h|m|hr|min)\b/i;
const TODAY_RE = /\btoday\b/gi;
const TOMORROW_RE = /\btomorrow\b/gi;
const NEXT_WEEK_RE = /\bnext\s+week\b/gi;

function stripTokens(text: string, tokens: RegExp[]): string {
  let out = text;
  for (const re of tokens) {
    out = out.replace(re, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

export function parseQuickAdd(input: string): QuickAddResult {
  const raw = input.trim();
  if (!raw) return { title: "" };

  const lower = raw.toLowerCase();
  const now = new Date();
  let base: Date | null = null;
  const used: RegExp[] = [];

  const inMatch = raw.match(IN_RE);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2].toLowerCase();
    if (unit === "h" || unit === "hr") {
      base = addHours(now, n);
    } else {
      base = addMinutes(now, n);
    }
    used.push(/\bin\s*\d+\s*(?:h|m|hr|min)\b/gi);
  }

  if (!base && /tomorrow/.test(lower)) {
    base = startOfDay(addDays(now, 1));
    used.push(TOMORROW_RE);
  }
  if (!base && /today/.test(lower)) {
    base = startOfDay(now);
    used.push(TODAY_RE);
  }
  if (!base && /next\s+week/.test(lower)) {
    base = startOfDay(addWeeks(now, 1));
    used.push(NEXT_WEEK_RE);
  }
  if (!base) {
    base = startOfDay(now);
  }

  const timeMatch = raw.match(TIME_RE);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      base = setMinutes(setHours(base, hour), minute);
    }
    used.push(TIME_RE);
  }

  const title = stripTokens(raw, used);
  if (!title) return { title: raw };

  const dueAt = base.toISOString();
  const remindAt = base.toISOString();

  return { title, dueAt, remindAt };
}
