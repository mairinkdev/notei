export type CalendarViewType = "month" | "week" | "day" | "agenda";

export type CalendarViewPrefs = {
  defaultView: CalendarViewType;
  weekStartsOn: 0 | 1;
  showWeekNumbers: boolean;
  dayStartHour: number;
  dayEndHour: number;
};

export type CalendarEvent = {
  id: string;
  title: string;
  notes?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone?: string;
  reminderIds: string[];
  linkedNoteId?: string | null;
  participants?: string[];
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  recurrence?: unknown;
};

export const DEFAULT_CALENDAR_VIEW_PREFS: CalendarViewPrefs = {
  defaultView: "month",
  weekStartsOn: 0,
  showWeekNumbers: false,
  dayStartHour: 6,
  dayEndHour: 22,
};
