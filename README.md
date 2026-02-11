# Notei

Notei is a local-first meeting notes and personal notes app for desktop. It combines a clean, minimal UI with reminders, a calendar, exports, and backups. Built with Tauri, Rust, and React. No cloud required.

**Highlights:** Local-first; no account or server; export to Markdown, JSON, PNG, and batch ZIP; reminders with native notifications; calendar with ICS import/export; custom titlebar; system tray; launch at startup; autosave; command palette (Ctrl/Cmd+K).

## Screenshots

To add screenshots or GIFs to this README:

1. Run the app: `npm run tauri:dev`
2. Capture the window (e.g. Print Screen, snipping tool, or OBS for GIFs)
3. Save images under `docs/screenshots/` and reference them here, for example:  
   `![Notei](docs/screenshots/main.png)`

If you do not add images yet, you can leave this section as-is and add files to `docs/screenshots/` when ready.

## Features

- **Notes** — Meeting and personal notes with rich text, toolbar (bold, italic, underline, headings, lists, checklists, links), templates (Agenda, Notes, Decisions, Action Items; Routine, Journal, Tasks), and search (title, tags, participants, content).
- **Reminders** — Lists (Inbox, custom lists), smart views (Today, Scheduled, Overdue, Completed, All), snooze, and native notifications at "Remind at" time. Stored in `reminders.json` and `reminder_lists.json`.
- **Calendar** — Month, week, day, and agenda views. Events with title, notes, location, dates; link to notes and "Remind me" (creates a linked reminder). ICS import/export via file dialog for interoperability with Google Calendar and others.
- **Export and sharing** — Per-note: Markdown, JSON, PNG (share card). Batch: ZIP with folders per note (MD, optional JSON, optional PNG, attachments). Copy as Markdown or image to clipboard; save/open file; quick links to open WhatsApp, Slack, Discord, Telegram (paste manually).
- **Backup and restore** — Data is stored locally; see "Data storage" below. Full backup/import is on the roadmap.
- **Local storage and security** — All data in app data directory; no cloud by default; capabilities restricted to app data and user-chosen paths via dialogs.
- **System tray** — Icon in the system tray with menu: Open Notei, New note, New reminder, New event, Quit. "Run in background" in Settings: when on, closing the window minimizes to tray instead of quitting.
- **Launch at startup** — Option in Settings (default OFF); uses the official Tauri plugin; preference stored in `settings.json`.
- **Custom window** — `decorations: false` with resize via 8 handles (edges and corners); minimize, maximize, and close in the titlebar.
- **Autosave** — Settings: Off (manual Save and "Unsaved" indicator), After delay (configurable debounce in ms), or On focus change (saves on leaving editor/title; beforeunload warning if there are unsaved changes).
- **Command palette** — Ctrl/Cmd+K: Create note, Search, Toggle theme, Export note, Create reminder, Create event, Go to Calendar/Reminders/Meetings/Personal.

## Tech stack

- **Desktop:** Tauri v2 (Rust backend)
- **Frontend:** React 18, TypeScript, Vite
- **UI:** Tailwind CSS, Framer Motion, Lucide React, TipTap (rich text)
- **Dates:** date-fns
- **Storage:** tauri-plugin-store (fallback to localStorage in browser for dev)
- **Tauri plugins:** store, fs, dialog, opener, clipboard-manager, notification, autostart, window (start-resize-dragging, etc.)

## Requirements

- **Node.js** 18+ (recommended 20). Check with `node -v`.
- **Rust** — Stable channel (project uses `rust-toolchain.toml`; after `npm install`, the first `tauri dev` or `tauri build` will use it). Minimum version is aligned with the toolchain file.
- **Cargo** — Included with Rust (`cargo -v`).
- **Tauri CLI** — Installed as a devDependency with `npm install` (`npx tauri -V`).
- **OS:** Windows, macOS, Linux. Some behavior (tray, notifications, autostart) varies by platform; see docs and decision records.

## Getting started

```bash
git clone <repo>
cd notei
npm install
npm run tauri:dev
```

- **Frontend only (browser):** `npm run dev` — persistence uses localStorage.
- **Production build:** `npm run tauri:build` — artifacts in `src-tauri/target/release/bundle/`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Frontend Vite (browser) |
| `npm run build` | Frontend build (TypeScript + Vite) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (src) |
| `npm run typecheck` | TypeScript (noEmit) |
| `npm run check:comments` | Fails if `//`, `/* */`, TODO, or FIXME exist in src/ and src-tauri/ |
| `npm run test` | Unit tests (Vitest) |
| `npm run tauri:dev` | Desktop app (dev) |
| `npm run tauri:build` | Desktop app (release) |

## Data storage (local-first)

- **Tauri:** App data directory (e.g. Windows: `%APPDATA%\com.notei.app\`; macOS: `~/Library/Application Support/com.notei.app/`):  
  `notes.json`, `settings.json`, `reminders.json`, `reminder_lists.json`, `events.json`, `calendar_settings.json`, and `attachments/` for images.
- **Browser (dev):** localStorage with prefix `notei-store-`.
- **Format:** JSON with schema version where applicable; migrations are used for breaking changes.
- **Timezone:** Values are stored in ISO UTC; the UI uses the system/local timezone for display.

## Permissions and capabilities (Tauri)

Capabilities are defined in `src-tauri/capabilities/default.json`: window (close, minimize, toggle maximize, start-dragging, start-resize-dragging), store, fs (app data recursive), dialog, opener, clipboard-manager, notification, autostart. File system access is limited to app data unless the user selects a path via a dialog (e.g. export, import ICS). Export/import paths are always user-chosen.

## Privacy

- No cloud by default; all data stays on the device.
- No tracking or analytics.
- Exports are user-initiated only.

## Roadmap

- Full backup and import (e.g. restore from ZIP or backup file).
- Performance improvements (e.g. virtualization for large lists).
- Pin/archive from editor (quick actions).
- Accessibility refinements (focus, ARIA; reduced motion is already considered).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: run `npm run check:comments`, `npm run typecheck`, and `npm run lint` before submitting a PR; follow the no-comments rule and TypeScript strictness; keep architecture clean.

## Security

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities (e.g. email or GitHub private report). We do not promise an SLA for fixes.

## License

MIT. The [LICENSE](https://github.com/mairinkdev/notei/blob/main/LICENSE) file is in this repository.

## Project structure (summary)

```
notei/
├── src/
│   ├── app/           # Shell, Titlebar, Sidebar, ListPane, EditorPane, views
│   ├── components/    # ExportCard, ui/ (Button, Card, Dialog, etc.)
│   ├── features/
│   │   ├── notes/     # types, repository, NoteEditor
│   │   ├── attachments/  # attachmentService
│   │   ├── reminders/ # types, repository, scheduler
│   │   ├── calendar/  # types, repository, ics
│   │   ├── settings/  # types, repository, useThemeModeSync
│   │   ├── export/    # exportNote, noteToMarkdown
│   │   └── share/     # shareNote
│   ├── lib/           # cn, store, tauri
│   ├── strings/       # en.ts, t.ts (i18n)
│   └── theme/         # ThemeProvider
├── src-tauri/
│   ├── capabilities/  # default.json
│   ├── src/           # lib.rs, main.rs
│   └── tauri.conf.json
├── docs/
│   └── decision-records.md
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

Architecture and design decisions are documented in [docs/decision-records.md](docs/decision-records.md).
