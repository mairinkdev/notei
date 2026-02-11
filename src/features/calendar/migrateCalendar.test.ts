import { describe, it, expect } from "vitest";
import {
  migrateCalendarEvents,
  migrateCalendarSettings,
  CALENDAR_EVENTS_STORE_VERSION,
} from "./migrateCalendar";
import { DEFAULT_CALENDAR_VIEW_PREFS } from "./types";

describe("migrateCalendarEvents", () => {
  it("returns empty array for null/undefined", () => {
    expect(migrateCalendarEvents(null)).toEqual([]);
    expect(migrateCalendarEvents(undefined)).toEqual([]);
  });

  it("returns empty array for non-object payload", () => {
    expect(migrateCalendarEvents("x")).toEqual([]);
    expect(migrateCalendarEvents(42)).toEqual([]);
  });

  it("accepts payload with events array", () => {
    const raw = {
      version: CALENDAR_EVENTS_STORE_VERSION,
      events: [
        {
          id: "e1",
          title: "Meeting",
          startAt: "2025-02-10T09:00:00.000Z",
          endAt: "2025-02-10T10:00:00.000Z",
          allDay: false,
          reminderIds: [],
          createdAt: "2025-02-09T00:00:00.000Z",
          updatedAt: "2025-02-09T00:00:00.000Z",
        },
      ],
    };
    const out = migrateCalendarEvents(raw);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("e1");
    expect(out[0].title).toBe("Meeting");
    expect(out[0].startAt).toBe("2025-02-10T09:00:00.000Z");
    expect(out[0].reminderIds).toEqual([]);
  });

  it("drops events without id", () => {
    const raw = { events: [{ title: "No id" }] };
    expect(migrateCalendarEvents(raw)).toEqual([]);
  });

  it("normalizes reminderIds and linkedNoteId", () => {
    const raw = {
      events: [
        {
          id: "e2",
          title: "Ev",
          startAt: "2025-02-10T09:00:00.000Z",
          endAt: "2025-02-10T10:00:00.000Z",
          allDay: false,
          reminderIds: ["r1", 2, "r3"],
          linkedNoteId: "n1",
          createdAt: "2025-02-09T00:00:00.000Z",
          updatedAt: "2025-02-09T00:00:00.000Z",
        },
      ],
    };
    const out = migrateCalendarEvents(raw);
    expect(out[0].reminderIds).toEqual(["r1", "r3"]);
    expect(out[0].linkedNoteId).toBe("n1");
  });
});

describe("migrateCalendarSettings", () => {
  it("returns default prefs for null/undefined", () => {
    expect(migrateCalendarSettings(null)).toEqual(DEFAULT_CALENDAR_VIEW_PREFS);
    expect(migrateCalendarSettings(undefined)).toEqual(DEFAULT_CALENDAR_VIEW_PREFS);
  });

  it("preserves valid defaultView and weekStartsOn", () => {
    const out = migrateCalendarSettings({
      defaultView: "week",
      weekStartsOn: 1,
      showWeekNumbers: true,
    });
    expect(out.defaultView).toBe("week");
    expect(out.weekStartsOn).toBe(1);
    expect(out.showWeekNumbers).toBe(true);
  });

  it("rejects invalid defaultView", () => {
    const out = migrateCalendarSettings({ defaultView: "invalid" });
    expect(out.defaultView).toBe(DEFAULT_CALENDAR_VIEW_PREFS.defaultView);
  });
});
