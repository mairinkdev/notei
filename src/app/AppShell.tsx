import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Titlebar } from "@/app/Titlebar";
import { ResizeHandles } from "@/app/ResizeHandles";
import { Sidebar } from "@/app/Sidebar";
import { ListPane } from "@/app/ListPane";
import { EditorPane } from "@/app/EditorPane";
import { TemplatesView } from "@/app/TemplatesView";
import { ArchiveView } from "@/app/ArchiveView";
import { SettingsView } from "@/app/SettingsView";
import { RemindersView } from "@/app/RemindersView";
import { CalendarView } from "@/app/CalendarView";
import { CommandPalette, type CommandAction } from "@/app/CommandPalette";
import { setNavigateHandler } from "@/app/useNavigate";
import type { NoteKind } from "@/features/notes/types";
import { listNotes, createNote, getNote } from "@/features/notes/repository";
import { runCleanupOrphanAttachments } from "@/features/attachments/attachmentService";
import { startReminderScheduler } from "@/features/reminders/scheduler";
import { useTheme } from "@/theme/themeContext";
import { exportNoteAsMarkdown } from "@/features/export/exportNote";
import { isTauri } from "@/lib/tauri";
import { getSettings } from "@/features/settings/repository";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { t } from "@/strings/t";

export type Section =
  | { type: "meetings" }
  | { type: "personal" }
  | { type: "calendar" }
  | { type: "reminders" }
  | { type: "templates" }
  | { type: "archive" }
  | { type: "settings" };

export function AppShell() {
  const [section, setSection] = useState<Section>({ type: "meetings" });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quitDialogOpen, setQuitDialogOpen] = useState(false);
  const [pendingQuitAfterSave, setPendingQuitAfterSave] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const { setMode, resolved } = useTheme();

  const handleSection = useCallback((s: Section) => {
    setSection(s);
    setSelectedNoteId(null);
  }, []);

  useEffect(() => {
    setNavigateHandler((s, noteId) => {
      setSection(s);
      setSelectedNoteId(noteId ?? null);
    });
    return () => setNavigateHandler(() => {});
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => {
      listNotes({})
        .then((notes) => {
          runCleanupOrphanAttachments(new Set(notes.map((n) => n.id)), {
            signal: ac.signal,
          });
        })
        .catch(() => {});
    }, 0);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, []);

  useEffect(() => {
    const stop = startReminderScheduler();
    return stop;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "r" && e.key !== "R") return;
      const target = document.activeElement as HTMLElement | null;
      if (target?.closest?.("[contenteditable=true]") || target?.closest?.(".ProseMirror")) return;
      if (section.type === "reminders") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("notei:new-reminder"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [section.type]);

  useEffect(() => {
    if (!isTauri()) return;
    const setup = async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const unlisten = await win.onCloseRequested(async (event) => {
        const s = await getSettings().catch(() => null);
        if (s?.runInBackground) {
          event.preventDefault();
          await win.hide();
        }
      });
      return () => {
        unlisten();
      };
    };
    let teardown: (() => void) | undefined;
    setup().then((t) => {
      teardown = t;
    });
    return () => teardown?.();
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let teardown: (() => void) | undefined;
    const setup = async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const { defaultWindowIcon } = await import("@tauri-apps/api/app");
      const { Menu } = await import("@tauri-apps/api/menu");
      const { TrayIcon } = await import("@tauri-apps/api/tray");
      const win = getCurrentWindow();
      const onTrayAction = (id: string) => {
        if (id === "quit") {
          window.dispatchEvent(new CustomEvent("notei:quit-requested"));
          return;
        }
        if (id === "open") {
          win.show().catch(() => {});
          win.setFocus().catch(() => {});
          return;
        }
        window.dispatchEvent(new CustomEvent("notei:command", { detail: { id } }));
        if (id === "create-event") {
          requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("notei:new-event")));
        }
        if (id === "create-reminder") {
          requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("notei:new-reminder")));
        }
        win.show().catch(() => {});
        win.setFocus().catch(() => {});
      };
      const menu = await Menu.new({
        items: [
          { id: "open", text: t("appShell.trayOpen"), action: (id) => onTrayAction(id) },
          { id: "create-note", text: t("appShell.trayNewNote"), action: (id) => onTrayAction(id) },
          { id: "create-reminder", text: t("appShell.trayNewReminder"), action: (id) => onTrayAction(id) },
          { id: "create-event", text: t("appShell.trayNewEvent"), action: (id) => onTrayAction(id) },
          { id: "quit", text: t("appShell.trayQuit"), action: (id) => onTrayAction(id) },
        ],
      });
      const icon = await defaultWindowIcon();
      const tray = await TrayIcon.new({ menu, icon: icon ?? undefined, showMenuOnLeftClick: true });
      return () => {
        tray.close().catch(() => {});
      };
    };
    setup().then((t) => {
      teardown = t;
    });
    return () => teardown?.();
  }, []);

  const showListAndEditor =
    section.type === "meetings" || section.type === "personal";

  const listFilter: { kind?: NoteKind; archived?: boolean } =
    section.type === "meetings"
      ? { kind: "meeting", archived: false }
      : section.type === "personal"
        ? { kind: "personal", archived: false }
        : {};

  const handleCommand = useCallback(
    (id: string) => {
      switch (id) {
        case "create-note":
          createNote("meeting").then((note) => {
            setSection({ type: "meetings" });
            setSelectedNoteId(note.id);
          });
          break;
        case "search":
          setSearchOpen(true);
          break;
        case "toggle-theme":
          setMode(resolved === "dark" ? "light" : "dark");
          break;
        case "export-note":
          if (selectedNoteId) {
            getNote(selectedNoteId).then((note) => {
              if (note) exportNoteAsMarkdown(note);
            });
          }
          break;
        case "create-reminder":
          setSection({ type: "reminders" });
          break;
        case "create-event":
          setSection({ type: "calendar" });
          break;
        case "go-calendar":
          setSection({ type: "calendar" });
          break;
        case "go-reminders":
          setSection({ type: "reminders" });
          break;
        case "go-meetings":
          setSection({ type: "meetings" });
          break;
        case "go-personal":
          setSection({ type: "personal" });
          break;
        default:
          break;
      }
    },
    [setMode, resolved, selectedNoteId]
  );

  useEffect(() => {
    const handler = (e: Event) => {
      handleCommand((e as CustomEvent<{ id: string }>).detail.id);
    };
    window.addEventListener("notei:command", handler);
    return () => window.removeEventListener("notei:command", handler);
  }, [handleCommand]);

  useEffect(() => {
    if (!isTauri()) return;
    const handler = () => {
      getSettings()
        .then((s) => {
          const hasUnsaved = hasUnsavedChangesRef.current;
          if (s?.autosave?.mode === "off" && hasUnsaved) {
            setQuitDialogOpen(true);
          } else {
            import("@tauri-apps/api/core").then(({ invoke }) => invoke("exit_app").catch(() => {}));
          }
        })
        .catch(() => {
          import("@tauri-apps/api/core").then(({ invoke }) => invoke("exit_app").catch(() => {}));
        });
    };
    window.addEventListener("notei:quit-requested", handler);
    return () => window.removeEventListener("notei:quit-requested", handler);
  }, []);

  useEffect(() => {
    if (!pendingQuitAfterSave || !isTauri()) return;
    let done = false;
    const doExit = () => {
      if (done) return;
      done = true;
      setPendingQuitAfterSave(false);
      import("@tauri-apps/api/core").then(({ invoke }) => invoke("exit_app").catch(() => {}));
    };
    const t = setTimeout(doExit, 500);
    const onDone = () => {
      clearTimeout(t);
      doExit();
    };
    window.addEventListener("notei:flush-save-done", onDone);
    return () => {
      clearTimeout(t);
      window.removeEventListener("notei:flush-save-done", onDone);
    };
  }, [pendingQuitAfterSave]);

  const handleQuitSaveAndQuit = useCallback(() => {
    setQuitDialogOpen(false);
    setPendingQuitAfterSave(true);
    window.dispatchEvent(new CustomEvent("notei:flush-save-and-quit"));
  }, []);

  const handleQuitWithoutSaving = useCallback(() => {
    setQuitDialogOpen(false);
    import("@tauri-apps/api/core").then(({ invoke }) => invoke("exit_app").catch(() => {}));
  }, []);

  const commandActions: CommandAction[] = useMemo(
    () => [
      { id: "create-note", label: t("commandPalette.createNote"), keywords: "new meeting" },
      { id: "search", label: t("commandPalette.searchNotes"), keywords: "find" },
      { id: "toggle-theme", label: t("commandPalette.toggleTheme"), keywords: "dark light" },
      { id: "export-note", label: t("commandPalette.exportNote"), keywords: "markdown md" },
      { id: "create-reminder", label: t("commandPalette.createReminder"), keywords: "reminders" },
      { id: "create-event", label: t("commandPalette.createEvent"), keywords: "calendar" },
      { id: "go-calendar", label: t("commandPalette.goToCalendar"), keywords: "calendar" },
      { id: "go-reminders", label: t("commandPalette.goToReminders"), keywords: "reminders" },
      { id: "go-meetings", label: t("commandPalette.goToMeetings"), keywords: "notes" },
      { id: "go-personal", label: t("commandPalette.goToPersonal"), keywords: "notes" },
    ],
    []
  );

  return (
    <div className="app-frame flex h-screen flex-col overflow-hidden">
      <ResizeHandles />
      <Titlebar
        searchQuery={searchQuery}
        onSearchQuery={setSearchQuery}
        searchOpen={searchOpen}
        onSearchOpen={setSearchOpen}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        actions={commandActions}
        onSelect={handleCommand}
      />
      <Dialog
        open={quitDialogOpen}
        onClose={() => setQuitDialogOpen(false)}
        title={t("appShell.quitDialogTitle")}
      >
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          {t("appShell.quitDialogMessage")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={handleQuitSaveAndQuit}>
            {t("appShell.saveAndQuit")}
          </Button>
          <Button variant="ghost" onClick={handleQuitWithoutSaving}>
            {t("appShell.quitWithoutSaving")}
          </Button>
          <Button variant="ghost" onClick={() => setQuitDialogOpen(false)}>
            {t("appShell.cancel")}
          </Button>
        </div>
      </Dialog>
      <div className="flex min-h-0 flex-1">
        <Sidebar section={section} onSection={handleSection} />
        {showListAndEditor && (
          <>
            <ListPane
              filter={listFilter}
              searchQuery={searchQuery}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
            />
            <EditorPane
              noteId={selectedNoteId}
              onClose={() => setSelectedNoteId(null)}
              onUnsavedChange={(v) => {
                hasUnsavedChangesRef.current = v;
              }}
            />
          </>
        )}
        {section.type === "calendar" && <CalendarView />}
        {section.type === "reminders" && (
          <RemindersView />
        )}
        {section.type === "templates" && <TemplatesView />}
        {section.type === "archive" && (
          <ArchiveView onRestore={() => setSection({ type: "meetings" })} />
        )}
        {section.type === "settings" && <SettingsView />}
      </div>
    </div>
  );
}
