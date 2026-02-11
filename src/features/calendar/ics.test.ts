import { describe, it, expect } from "vitest";
import { parseIcs, eventsToIcs } from "./ics";
import type { CalendarEvent } from "./types";

const FIXTURE_ALL_DAY = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20250210",
  "DTEND;VALUE=DATE:20250211",
  "SUMMARY:All day event",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const FIXTURE_DATE_TIME = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTSTART:20250210T140000Z",
  "DTEND:20250210T150000Z",
  "SUMMARY:Meeting at 2pm",
  "DESCRIPTION:Discuss project",
  "LOCATION:Room A",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const FIXTURE_MULTIPLE = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "BEGIN:VEVENT",
  "DTSTART:20250209T090000Z",
  "DTEND:20250209T100000Z",
  "SUMMARY:First",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20250212",
  "DTEND;VALUE=DATE:20250213",
  "SUMMARY:Second event",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcs", () => {
  it("parses all-day VEVENT (DATE)", () => {
    const events = parseIcs(FIXTURE_ALL_DAY);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("All day event");
    expect(events[0].allDay).toBe(true);
    expect(events[0].startAt).toContain("2025-02-10");
    expect(events[0].endAt).toContain("2025-02-11");
  });

  it("parses DATE-TIME VEVENT with DESCRIPTION and LOCATION", () => {
    const events = parseIcs(FIXTURE_DATE_TIME);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("Meeting at 2pm");
    expect(events[0].description).toBe("Discuss project");
    expect(events[0].location).toBe("Room A");
    expect(events[0].allDay).toBe(false);
    expect(events[0].startAt).toContain("2025-02-10");
  });

  it("parses multiple VEVENTs", () => {
    const events = parseIcs(FIXTURE_MULTIPLE);
    expect(events).toHaveLength(2);
    expect(events[0].summary).toBe("First");
    expect(events[0].allDay).toBe(false);
    expect(events[1].summary).toBe("Second event");
    expect(events[1].allDay).toBe(true);
  });
});

describe("eventsToIcs", () => {
  it("exports single event to valid ICS", () => {
    const events: CalendarEvent[] = [
      {
        id: "ev1",
        title: "Exported",
        startAt: "2025-02-10T14:00:00.000Z",
        endAt: "2025-02-10T15:00:00.000Z",
        allDay: false,
        reminderIds: [],
        createdAt: "2025-02-09T00:00:00.000Z",
        updatedAt: "2025-02-09T00:00:00.000Z",
      },
    ];
    const ics = eventsToIcs(events);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Exported");
    expect(ics).toContain("END:VCALENDAR");
    const parsed = parseIcs(ics);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].summary).toBe("Exported");
  });

  it("all-day import/export roundtrip preserves DATE and exclusive DTEND", () => {
    const allDayEvent: CalendarEvent[] = [
      {
        id: "ev-allday",
        title: "All day roundtrip",
        startAt: "2025-03-01T00:00:00.000Z",
        endAt: "2025-03-02T00:00:00.000Z",
        allDay: true,
        reminderIds: [],
        createdAt: "2025-02-09T00:00:00.000Z",
        updatedAt: "2025-02-09T00:00:00.000Z",
      },
    ];
    const ics = eventsToIcs(allDayEvent);
    expect(ics).toContain("DTSTART;VALUE=DATE:20250301");
    expect(ics).toContain("DTEND;VALUE=DATE:20250302");
    const parsed = parseIcs(ics);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].allDay).toBe(true);
    expect(parsed[0].startAt).toContain("2025-03-01");
    expect(parsed[0].endAt).toContain("2025-03-02");
  });

  it("timed event crossing midnight exports and imports correctly", () => {
    const crossMidnight: CalendarEvent[] = [
      {
        id: "ev-midnight",
        title: "Late night",
        startAt: "2025-02-10T22:00:00.000Z",
        endAt: "2025-02-11T02:00:00.000Z",
        allDay: false,
        reminderIds: [],
        createdAt: "2025-02-09T00:00:00.000Z",
        updatedAt: "2025-02-09T00:00:00.000Z",
      },
    ];
    const ics = eventsToIcs(crossMidnight);
    const parsed = parseIcs(ics);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].summary).toBe("Late night");
    expect(parsed[0].startAt).toContain("2025-02-10");
    expect(parsed[0].endAt).toContain("2025-02-11");
  });
});
