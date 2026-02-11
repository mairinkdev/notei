import { describe, it, expect } from "vitest";
import { migrateNotes, NOTES_SCHEMA_VERSION } from "./migrateNotes";
import type { Note } from "./types";

describe("migrateNotes", () => {
  it("returns empty array and current version for null/undefined/non-array", () => {
    expect(migrateNotes(null)).toEqual({ notes: [], schemaVersion: NOTES_SCHEMA_VERSION });
    expect(migrateNotes(undefined)).toEqual({ notes: [], schemaVersion: NOTES_SCHEMA_VERSION });
  });

  it("returns empty array for non-array input", () => {
    expect(migrateNotes({})).toEqual({ notes: [], schemaVersion: NOTES_SCHEMA_VERSION });
    expect(migrateNotes("x")).toEqual({ notes: [], schemaVersion: NOTES_SCHEMA_VERSION });
  });

  it("migrates old note without attachments to full structure", () => {
    const old = [
      {
        id: "n1",
        kind: "meeting",
        title: "Old",
        content: { type: "doc", content: [] },
        plainText: "",
        tags: [],
        participants: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        pinned: false,
        archived: false,
      },
    ];
    const { notes, schemaVersion } = migrateNotes(old);
    expect(schemaVersion).toBe(NOTES_SCHEMA_VERSION);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      id: "n1",
      kind: "meeting",
      title: "Old",
      archived: false,
      attachments: [],
    });
    expect(notes[0].attachments).toEqual([]);
  });

  it("migrates minimal legacy object to valid note", () => {
    const { notes } = migrateNotes([{ id: "x" }]);
    expect(notes[0].id).toBe("x");
    expect(notes[0].kind).toBe("personal");
    expect(notes[0].title).toBe("Untitled");
    expect(notes[0].content).toEqual({ type: "doc", content: [] });
    expect(notes[0].plainText).toBe("");
    expect(notes[0].tags).toEqual([]);
    expect(notes[0].participants).toEqual([]);
    expect(notes[0].attachments).toEqual([]);
    expect(notes[0].pinned).toBe(false);
    expect(notes[0].archived).toBe(false);
  });
});

describe("export compatibility with migrated notes", () => {
  it("migrated note has shape required for export (title, content, updatedAt, participants, tags)", () => {
    const { notes } = migrateNotes([
      {
        id: "e1",
        kind: "personal",
        title: "Legacy",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] },
        plainText: "Hi",
        tags: ["a"],
        participants: ["Alice"],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        pinned: false,
        archived: false,
      },
    ]);
    const note = notes[0] as Note;
    expect(note.title).toBe("Legacy");
    expect(note.content).toEqual({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] });
    expect(note.updatedAt).toBeDefined();
    expect(note.participants).toEqual(["Alice"]);
    expect(note.tags).toEqual(["a"]);
    expect(note.attachments).toEqual([]);
  });
});
