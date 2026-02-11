# Decision Records

Architecture and design decisions for the Notei project, documented to keep the public repository consistent and understandable.

---

## DR-001: No comments in code

**Context:** The repository is public and the code should be self-explanatory.

**Decision:** No comments in code (including `//`, `/* */`, `TODO:`, `FIXME:`, or explanatory `@ts-ignore`). Necessary explanations live in the README or in this document.

**Consequences:** Developers must name functions and variables well and keep functions small. Non-obvious decisions are recorded here.

---

## DR-002: Local persistence with browser fallback

**Context:** The app is desktop-first (Tauri) but we want to run the frontend in the browser for development (e.g. `npm run dev`).

**Decision:** `src/lib/store.ts` tries to load the Tauri store plugin; on failure (browser), it uses an in-memory adapter plus `localStorage` with the same interface. Repositories (notes, settings, etc.) use this single store.

**Consequences:** Data in the browser is not shared with the Tauri app. Export/Share features that depend on dialog/fs/opener/clipboard only work in Tauri.

---

## DR-003: Theme and settings synced via hook

**Context:** Theme (light/dark/system) must be persisted and applied on startup.

**Decision:** `ThemeProvider` controls the theme in React. `useThemeModeSync` (used in the Titlebar) loads the saved theme on mount and persists changes to `settings` when the user changes the theme. A ref `initialLoadDone` avoids overwriting the saved theme on the first render.

**Consequences:** The app has a single theme that always reflects the last saved value (or system).

---

## DR-004: Navigation between sections via global handler

**Context:** Templates and Archive need to open a note in Meetings or Personal and focus the editor.

**Decision:** A global handler `window.__noteiNavigate(section, noteId?)` is registered in `AppShell` via `setNavigateHandler`. Components such as `TemplatesView` use `useNavigate()` to get the function and call it after creating a note.

**Consequences:** Light coupling to the window object; avoids prop drilling. An alternative would be a dedicated navigation Context.

---

## DR-005: Batch export (ZIP) without PNG per note

**Context:** The spec called for ZIP with `notes/*.md`, optional `notes/*.json`, and optional PNG per note.

**Decision:** The first version of ZIP export produces only Markdown and, optionally, JSON. Adding PNG per note would require rendering each note in a DOM node (or offscreen) and calling `html-to-image` per note, with performance and complexity impact. Left as a future improvement; the export modal now supports optional PNG per note where implemented.

**Consequences:** Users can export notes in bulk as MD/JSON (and PNG when the option is available); for per-note control, they use single-note export.

---

## DR-006: Restrictive Tauri capabilities

**Context:** Security and principle of least privilege.

**Decision:** In `src-tauri/capabilities/default.json` we enable only: core (window: close, minimize, toggle maximize, start-dragging, start-resize-dragging), store default, fs (appdata recursive read/write/meta and scope), dialog default, opener default, clipboard-manager default, notification, autostart. No global permissions; fs is limited to app directories. To save to a user-chosen path (dialog), the path returned by the dialog is used with the fs plugin as per Tauri docs.

**Consequences:** The app cannot access arbitrary system files beyond what the user selects in the dialog and the app data directory.

---

## DR-007: Strong typing and no `any`

**Context:** Clean, maintainable code.

**Decision:** TypeScript in strict mode; no `any`. Explicit types for Note, Settings, filters, and repository payloads. For editor content (TipTap), we use `Record<string, unknown>` and typed helpers for plain text (e.g. getPlainText with JSONNode).

**Consequences:** Safer refactors and autocomplete; occasional type assertions may be needed when integrating with libraries that lack perfect types.

---

## DR-008: Custom titlebar and undecorated window

**Context:** “Apple-like” look and full control of the title bar.

**Decision:** Main window with `decorations: false`, minimum size 900x600 and default 1100x720. Custom 44px titlebar with `data-tauri-drag-region` on the draggable area; theme and search buttons; on Windows/Linux, window controls (minimize, maximize, close) on the right. On macOS, with `decorations: false` we use the same custom buttons.

**Consequences:** Consistent layout across platforms; we must not put `data-tauri-drag-region` on buttons/inputs so they remain interactive.

---

## DR-009: Reminders and notification scheduler

**Context:** The product needs a reminder system (Apple Reminders–style) with native notifications. The Tauri `notification` plugin does not expose an API to schedule a notification for an exact date/time.

**Decision:** Persistence in `reminders.json` and `reminder_lists.json` (with version in the payload for migration). Notifications: a frontend scheduler in `src/features/reminders/scheduler.ts` starts in AppShell, runs every 30s only in Tauri, checks permission (isPermissionGranted / requestPermission), loads reminders with `loadReminders()`, filters those with `remindAt` in the past and no `notificationFiredAt`, sends `sendNotification`, and updates the reminder with `notificationFiredAt`. When completing or changing `remindAt`, `notificationFiredAt` is cleared when the user changes the alert time so a new notification can fire. Recurrence does not duplicate reminders on restart: each reminder is a single entity; “next occurrence” logic (e.g. rescheduleRecurringNext) can create a new reminder when the user completes a recurring one, if implemented in the UI flow.

**Consequences:** Notifications depend on the app (or at least the Tauri process) running. On Windows, installed (MSI) notifications work with the notification center; in dev, permission may need to be granted. No comments in code; decision documented here.

---

## DR-010: Monochrome palette (no blue)

**Context:** The design system should feel premium and consistent in light/dark, without blue tones.

**Decision:** In `src/index.css`, `--accent` and `--accent-hover` use graphite/gray tones: light (--accent: #424245, --accent-hover: #1d1d1f), dark (--accent: #98989d, --accent-hover: #e8e8ed). `--surface-2` added for secondary surfaces. No blue hex in components; buttons, links, and focus use these variables. `.export-force-light` follows the same palette.

**Consequences:** Uniform, professional look; contrast and accessibility preserved. Primary buttons still stand out by contrast (dark on light background, light on dark).

---

## DR-011: Local-first calendar and ICS

**Context:** Calendar similar to Google Calendar, without a backend: local data and interoperability via iCalendar (.ics).

**Decision:** Events in `events.json` (store app data); view preferences in `calendar_settings.json` or inside settings with a versioned schema. CalendarEvent model with id, title, notes, location, startAt, endAt, allDay, timezone, reminderIds, linkedNoteId, participants, color (gray scale), optional recurrence. Export/import .ics via dialog (save/open): export selected events; minimal import of VEVENT with DTSTART, DTEND, SUMMARY, DESCRIPTION, LOCATION. Users can “connect” with Google Calendar by exporting/importing files, without a backend. Migrations covered by tests (Vitest).

**Consequences:** Calendar is fully offline; integration with other calendars only via .ics files.

---

## DR-012: Resize handles with startResizeDragging

**Context:** With `decorations: false`, native resize may not work in some environments; explicit control of edges is needed.

**Decision:** Eight invisible handles (top, bottom, left, right, topLeft, topRight, bottomLeft, bottomRight), 8px thick, `position: absolute` inside `.app-frame`. Cursor per direction (ns-resize, ew-resize, nwse-resize, nesw-resize). On left-button `pointerdown`, call `getCurrentWindow().startResizeDragging(direction)`. Permission `core:window:allow-start-resize-dragging` in capabilities. Handles container at z-index 5; titlebar at z-index 10 so the titlebar drag region stays above the top handles. Rounded corners and overflow hidden preserved; handles inside the frame.

**Consequences:** Consistent resize on all edges; top/topLeft/topRight under the titlebar still allow window drag.

---

## DR-013: Autostart and system tray

**Context:** Users may want to start the app with the system and keep it in the background when closing the window.

**Decision:** Official `tauri-plugin-autostart`: toggle in Settings “Launch at startup”, default OFF; preference in settings.json (launchAtStartup); when loading settings, sync OS state (enable/disable) to reflect the preference. Tray: icon in the system tray; menu New note/reminder/event, Open Notei, Quit; “Run in background” option in Settings; when that option is ON, closing the window minimizes to the tray instead of quitting. OS-specific and per-user (non-admin) limitations are documented in the README.

**Consequences:** Autostart depends on the plugin and OS policies; tray behavior may vary by platform.

---

## DR-014: Quit with unsaved changes

**Context:** When quitting via “Quit” in the system tray menu (or closing the window when Run in background is OFF), if the user has autosave OFF and unsaved changes in a note, there must be a clear rule.

**Decision:** The “Quit” item in the tray **always** exits the application (it is not affected by Run in background). If `autosave.mode === "off"` and there is at least one note with unsaved changes (dirty state in the editor), a confirmation dialog is shown before exiting with three options: **Save & Quit** (triggers editor flush, then exit), **Quit without saving** (exit immediately), **Cancel** (close dialog, app keeps running). If autosave is on or there are no unsaved changes, Quit exits directly without a dialog. The flush in Save & Quit uses the same `flushSave` as EditorPane; if the editor is not mounted or there is nothing to save, the event `notei:flush-save-done` is still emitted to unblock exit (with a 500 ms timeout as fallback).

**Consequences:** Predictable behavior: Quit in tray means exit app; unsaved changes with autosave off give one last chance to save or discard.
