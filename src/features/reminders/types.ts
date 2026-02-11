export type ReminderPriority = "none" | "low" | "medium" | "high";

export type ReminderRepeatFreq = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export type ReminderRepeat = {
  freq: ReminderRepeatFreq;
  interval: number;
  byWeekday?: number[];
  endAt?: string;
};

export type Reminder = {
  id: string;
  listId: string;
  title: string;
  notes?: string;
  linkedNoteId?: string;
  dueAt?: string;
  remindAt?: string;
  repeat?: ReminderRepeat | null;
  priority: ReminderPriority;
  completedAt?: string | null;
  notificationFiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sortKey: number;
};

export type ReminderList = {
  id: string;
  name: string;
  emoji?: string | null;
  createdAt: string;
  updatedAt: string;
  sortKey: number;
};

export type SmartFilterType = "today" | "scheduled" | "overdue" | "completed" | "all";

export type ListRemindersFilter = {
  listId?: string;
  completed?: boolean;
};
