import type { CalendarEvent } from "./types";

function unfoldLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines: string[] = [];
  let current = "";
  for (const line of normalized.split("\n")) {
    if (/^[ \t]/.test(line) && current) {
      current += line.slice(1);
    } else {
      if (current) lines.push(current);
      current = line;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function unescapeIcsValue(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDate(value: string): { date: Date; allDay: boolean } {
  const v = value.trim();
  if (v.length === 8) {
    const y = parseInt(v.slice(0, 4), 10);
    const m = parseInt(v.slice(4, 6), 10) - 1;
    const d = parseInt(v.slice(6, 8), 10);
    return { date: new Date(Date.UTC(y, m, d)), allDay: true };
  }
  if (v.length >= 15 && v[8] === "T") {
    const y = parseInt(v.slice(0, 4), 10);
    const m = parseInt(v.slice(4, 6), 10) - 1;
    const d = parseInt(v.slice(6, 8), 10);
    const h = parseInt(v.slice(9, 11), 10);
    const min = parseInt(v.slice(11, 13), 10);
    const sec = v.length >= 15 ? parseInt(v.slice(13, 15), 10) : 0;
    const z = v.endsWith("Z");
    const date = z
      ? new Date(Date.UTC(y, m, d, h, min, sec))
      : new Date(y, m, d, h, min, sec);
    return { date, allDay: false };
  }
  return { date: new Date(), allDay: false };
}

export type ParsedIcsEvent = {
  summary: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
};

export function parseIcs(icsText: string): ParsedIcsEvent[] {
  const lines = unfoldLines(icsText);
  const events: ParsedIcsEvent[] = [];
  let inEvent = false;
  let summary = "";
  let description: string | undefined;
  let location: string | undefined;
  let dtStart = "";
  let dtEnd = "";

  function flushEvent() {
    if (!dtStart) return;
    const start = parseIcsDate(dtStart);
    let endAt: string;
    if (dtEnd) {
      const end = parseIcsDate(dtEnd);
      endAt = end.date.toISOString();
    } else {
      if (start.allDay) {
        const d = new Date(start.date);
        d.setUTCDate(d.getUTCDate() + 1);
        endAt = d.toISOString();
      } else {
        endAt = new Date(start.date.getTime() + 60 * 60 * 1000).toISOString();
      }
    }
    events.push({
      summary: unescapeIcsValue(summary),
      description: description ? unescapeIcsValue(description) : undefined,
      location: location ? unescapeIcsValue(location) : undefined,
      startAt: start.date.toISOString(),
      endAt,
      allDay: start.allDay,
    });
  }

  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).toUpperCase().split(";")[0];
    const value = line.slice(colon + 1);

    if (key === "BEGIN" && value === "VEVENT") {
      if (inEvent) flushEvent();
      inEvent = true;
      summary = "";
      description = undefined;
      location = undefined;
      dtStart = "";
      dtEnd = "";
      continue;
    }
    if (key === "END" && value === "VEVENT") {
      flushEvent();
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    if (key === "SUMMARY") summary = value;
    else if (key === "DESCRIPTION") description = value;
    else if (key === "LOCATION") location = value;
    else if (key === "DTSTART") dtStart = value;
    else if (key === "DTEND") dtEnd = value;
  }
  if (inEvent) flushEvent();
  return events;
}

function formatIcsDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  if (allDay) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

function escapeIcsValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcsDateAllDayEnd(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return `${y}${String(m + 1).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  }
  const next = new Date(Date.UTC(y, m, day + 1));
  return `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, "0")}${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function eventsToIcs(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Notei//Calendar//EN",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@notei`);
    lines.push(`DTSTAMP:${formatIcsDate(e.createdAt, false)}`);
    lines.push(`DTSTART${e.allDay ? ";VALUE=DATE" : ""}:${formatIcsDate(e.startAt, e.allDay)}`);
    const endStr = e.allDay ? formatIcsDateAllDayEnd(e.endAt) : formatIcsDate(e.endAt, false);
    lines.push(`DTEND${e.allDay ? ";VALUE=DATE" : ""}:${endStr}`);
    lines.push(`SUMMARY:${escapeIcsValue(e.title)}`);
    if (e.notes) lines.push(`DESCRIPTION:${escapeIcsValue(e.notes)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcsValue(e.location)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
