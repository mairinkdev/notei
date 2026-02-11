import type { Note, NoteAttachment } from "./types";

export const NOTES_SCHEMA_VERSION = 1;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function ensureNote(raw: unknown): Note {
  const o = isRecord(raw) ? raw : {};
  const id = typeof o.id === "string" ? o.id : "";
  const kind = o.kind === "meeting" || o.kind === "personal" ? o.kind : "personal";
  const title = typeof o.title === "string" ? o.title : "Untitled";
  const content = isRecord(o.content) ? o.content : { type: "doc", content: [] };
  const plainText = typeof o.plainText === "string" ? o.plainText : "";
  const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === "string") : [];
  const participants = Array.isArray(o.participants) ? o.participants.filter((p): p is string => typeof p === "string") : [];
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString();
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : createdAt;
  const pinned = Boolean(o.pinned);
  const archived = Boolean(o.archived);
  const rawAtt = Array.isArray(o.attachments) ? o.attachments : [];
  const attachments: NoteAttachment[] = rawAtt
    .filter((a): a is Record<string, unknown> => isRecord(a))
    .map((a) => ({
      id: typeof a.id === "string" ? a.id : "",
      type: "image" as const,
      path: typeof a.path === "string" ? a.path : "",
      filename: typeof a.filename === "string" ? a.filename : undefined,
      mime: typeof a.mime === "string" ? a.mime : undefined,
      width: typeof a.width === "number" ? a.width : 0,
      height: typeof a.height === "number" ? a.height : 0,
      createdAt: typeof a.createdAt === "string" ? a.createdAt : new Date().toISOString(),
    }))
    .filter((a) => a.id && a.path);

  return {
    id,
    kind,
    title,
    content,
    plainText,
    tags,
    participants,
    createdAt,
    updatedAt,
    pinned,
    archived,
    attachments,
  };
}

export function migrateNotes(raw: unknown): { notes: Note[]; schemaVersion: number } {
  const arr = Array.isArray(raw) ? raw : [];
  const notes = arr.map(ensureNote);
  return { notes, schemaVersion: NOTES_SCHEMA_VERSION };
}
