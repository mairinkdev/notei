import { loadStore } from "@/lib/store";
import { v4 as uuid } from "uuid";
import type { Note, NoteKind, NotePatch, ListNotesFilter } from "./types";
import { deleteNoteAttachments } from "@/features/attachments/attachmentService";
import { migrateNotes, NOTES_SCHEMA_VERSION } from "./migrateNotes";

const STORE_PATH = "notes.json";

let store: Awaited<ReturnType<typeof loadStore>> | null = null;

async function getStore() {
  if (!store) {
    store = await loadStore(STORE_PATH, { autoSave: 400 });
  }
  return store;
}

async function getNotesFromStore(): Promise<Note[]> {
  const s = await getStore();
  const raw = await s.get<Note[]>("notes");
  const version = await s.get<number>("notesSchemaVersion");
  if (version !== NOTES_SCHEMA_VERSION) {
    const { notes, schemaVersion } = migrateNotes(raw);
    await s.set("notes", notes);
    await s.set("notesSchemaVersion", schemaVersion);
    await s.save();
    return notes;
  }
  return Array.isArray(raw) ? raw : [];
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function noteMatchesQuery(note: Note, query: string): boolean {
  const nq = normalizeQuery(query);
  if (!nq) return true;
  const titleMatch = note.title.toLowerCase().includes(nq);
  const plainMatch = note.plainText.toLowerCase().includes(nq);
  const tagMatch = note.tags.some((t) => t.toLowerCase().includes(nq));
  const partMatch = note.participants.some((p) =>
    p.toLowerCase().includes(nq)
  );
  return titleMatch || plainMatch || tagMatch || partMatch;
}

export async function listNotes(
  filter: ListNotesFilter = {}
): Promise<Note[]> {
  let notes = await getNotesFromStore();
  if (filter.kind) {
    notes = notes.filter((n) => n.kind === filter.kind);
  }
  if (filter.archived !== undefined) {
    notes = notes.filter((n) => n.archived === filter.archived);
  }
  if (filter.query) {
    notes = notes.filter((n) => noteMatchesQuery(n, filter.query ?? ""));
  }
  notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  return notes;
}

export async function getNote(id: string): Promise<Note | null> {
  const notes = await getNotesFromStore();
  return notes.find((n) => n.id === id) ?? null;
}

export async function createNote(
  kind: NoteKind,
  fromTemplate?: Partial<Note>
): Promise<Note> {
  const now = new Date().toISOString();
  const note: Note = {
    id: uuid(),
    kind,
    title: fromTemplate?.title ?? "Untitled",
    content: fromTemplate?.content ?? { type: "doc", content: [] },
    plainText: fromTemplate?.plainText ?? "",
    tags: fromTemplate?.tags ?? [],
    participants: fromTemplate?.participants ?? [],
    createdAt: fromTemplate?.createdAt ?? now,
    updatedAt: now,
    pinned: fromTemplate?.pinned ?? false,
    archived: fromTemplate?.archived ?? false,
    attachments: fromTemplate?.attachments ?? [],
  };
  const s = await getStore();
  const notes = await getNotesFromStore();
  notes.push(note);
  await s.set("notes", notes);
  await s.save();
  return note;
}

export async function updateNote(id: string, patch: NotePatch): Promise<Note | null> {
  const s = await getStore();
  const notes = await getNotesFromStore();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  notes[idx] = { ...notes[idx], ...patch, updatedAt: new Date().toISOString() };
  if (patch.plainText !== undefined) notes[idx].plainText = patch.plainText;
  await s.set("notes", notes);
  await s.save();
  return notes[idx];
}

export async function removeNote(id: string): Promise<boolean> {
  const s = await getStore();
  const notes = await getNotesFromStore();
  const prev = notes.length;
  const next = notes.filter((n) => n.id !== id);
  if (next.length === prev) return false;
  await deleteNoteAttachments(id);
  await s.set("notes", next);
  await s.save();
  return true;
}

export async function bulkUpdateNotes(
  ids: string[],
  patch: NotePatch
): Promise<void> {
  const s = await getStore();
  const notes = await getNotesFromStore();
  const idSet = new Set(ids);
  const now = new Date().toISOString();
  notes.forEach((n) => {
    if (idSet.has(n.id)) {
      Object.assign(n, patch, { updatedAt: now });
      if (patch.plainText !== undefined) n.plainText = patch.plainText;
    }
  });
  await s.set("notes", notes);
  await s.save();
}
