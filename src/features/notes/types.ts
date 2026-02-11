export type NoteKind = "meeting" | "personal";

export type NoteAttachment = {
  id: string;
  type: "image";
  path: string;
  filename?: string;
  mime?: string;
  width: number;
  height: number;
  createdAt: string;
};

export type Note = {
  id: string;
  kind: NoteKind;
  title: string;
  content: Record<string, unknown>;
  plainText: string;
  tags: string[];
  participants: string[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  archived: boolean;
  attachments: NoteAttachment[];
};

export type NotePatch = Partial<
  Omit<Note, "id" | "createdAt" | "plainText">
> & { plainText?: string };

export type ListNotesFilter = {
  kind?: NoteKind;
  query?: string;
  archived?: boolean;
};
