import { createRoot } from "react-dom/client";
import React from "react";
import { toPng } from "html-to-image";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile, writeFile, readFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import type { Note } from "@/features/notes/types";
import { format } from "date-fns";
import { noteContentToMarkdown } from "./noteToMarkdown";
import { ExportCard } from "@/components/ExportCard";
import { t, tReplace } from "@/strings/t";

function slug(title: string): string {
  return title
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 50) || "note";
}

export function noteToMarkdown(note: Note): string {
  const body = noteContentToMarkdown(note.content);
  const lines: string[] = [];
  lines.push(`# ${note.title}`);
  lines.push("");
  lines.push(`- Updated: ${format(new Date(note.updatedAt), "yyyy-MM-dd HH:mm")}`);
  if (note.participants.length) {
    lines.push(`- Participants: ${note.participants.join(", ")}`);
  }
  if (note.tags.length) {
    lines.push(`- Tags: ${note.tags.join(", ")}`);
  }
  lines.push("");
  lines.push(body);
  return lines.join("\n");
}

export async function exportNoteAsMarkdown(note: Note): Promise<string | null> {
  try {
    const filePath = await save({
      defaultPath: `${slug(note.title)}_${format(new Date(), "yyyyMMdd_HHmm")}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!filePath) return null;
    await writeTextFile(filePath, noteToMarkdown(note));
    return filePath;
  } catch {
    return null;
  }
}

export async function exportNoteAsJson(note: Note): Promise<string | null> {
  try {
    const filePath = await save({
      defaultPath: `${slug(note.title)}_${format(new Date(), "yyyyMMdd_HHmm")}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!filePath) return null;
    await writeTextFile(filePath, JSON.stringify(note, null, 2));
    return filePath;
  } catch {
    return null;
  }
}

export async function exportNoteAsPng(element: HTMLElement): Promise<string | null> {
  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: "var(--bg)",
    });
    const filePath = await save({
      defaultPath: `note_${format(new Date(), "yyyyMMdd_HHmm")}.png`,
      filters: [{ name: "PNG", extensions: ["png"] }],
    });
    if (!filePath) return null;
    const base64 = dataUrl.split(",")[1];
    if (!base64) return null;
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    await writeFile(filePath, bytes);
    return filePath;
  } catch {
    return null;
  }
}

export type ExportZipProgress = {
  percent: number;
  message: string;
  current: number;
  total: number;
};

export type ExportZipResult = {
  filePath: string | null;
  failedPng: { id: string; title: string }[];
};

const STAGING_ID = "notei-export-staging";

function getStagingContainer(): HTMLDivElement {
  let el = document.getElementById(STAGING_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = STAGING_ID;
    el.style.cssText = "position:fixed;left:-9999px;top:0;width:560px;pointer-events:none;";
    document.body.appendChild(el);
  }
  return el;
}

function clearStaging(container: HTMLDivElement, root: ReturnType<typeof createRoot> | null): void {
  if (root) {
    root.unmount();
  }
  container.innerHTML = "";
}

async function renderNoteToPng(
  note: Note,
  forceLight: boolean,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const container = getStagingContainer();
  let root: ReturnType<typeof createRoot> | null = null;
  try {
    root = createRoot(container);
    root.render(React.createElement(ExportCard, { note, forceLight }));
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise<void>((r) => setTimeout(r, 100));
    if (signal?.aborted) return new Uint8Array(0);
    const target = container.firstElementChild as HTMLElement;
    const dataUrl = await toPng(target ?? container, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: "var(--bg)",
    });
    const base64 = dataUrl.split(",")[1];
    if (!base64) return new Uint8Array(0);
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } finally {
    clearStaging(container, root);
  }
}

export async function exportBatchAsZip(
  notes: Note[],
  options: {
    includeJson?: boolean;
    includePng?: boolean;
    forceLight?: boolean;
    signal?: AbortSignal;
  },
  progress?: { onProgress: (p: ExportZipProgress) => void }
): Promise<ExportZipResult> {
  const failedPng: { id: string; title: string }[] = [];
  try {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const notesFolder = zip.folder("notes");
    if (!notesFolder) return { filePath: null, failedPng };
    const total = notes.length;
    const forceLight = options.forceLight ?? false;
    for (let i = 0; i < notes.length; i++) {
      if (options.signal?.aborted) break;
      const note = notes[i];
      const baseName = slug(note.title);
      const noteFolder = notesFolder.folder(baseName);
      if (!noteFolder) continue;
      const current = i + 1;
      progress?.onProgress({
        percent: total ? Math.round((i / total) * 100) : 0,
        message: tReplace("export.exportingNote", { title: note.title || t("notes.untitled") }),
        current,
        total,
      });
      noteFolder.file(`${baseName}.md`, noteToMarkdown(note));
      if (options.includeJson) {
        noteFolder.file(`${baseName}.json`, JSON.stringify(note, null, 2));
      }
      if (options.includePng) {
        try {
          const pngBytes = await renderNoteToPng(note, forceLight, options.signal);
          if (pngBytes.length > 0) noteFolder.file(`${baseName}.png`, pngBytes);
          else failedPng.push({ id: note.id, title: note.title || "Untitled" });
        } catch {
          failedPng.push({ id: note.id, title: note.title || "Untitled" });
        }
      }
      if (note.attachments.length > 0) {
        const attFolder = noteFolder.folder("attachments");
        if (attFolder) {
          for (const att of note.attachments) {
            try {
              const bytes = await readFile(att.path, {
                baseDir: BaseDirectory.AppData,
              });
              const ext = att.path.split(".").pop() ?? "png";
              attFolder.file(`${att.id}.${ext}`, bytes);
            } catch {
            }
          }
        }
      }
    }
    if (options.signal?.aborted) return { filePath: null, failedPng };
    progress?.onProgress({
      percent: 100,
      message: t("export.writingZip"),
      current: total,
      total,
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const filePath = await save({
      defaultPath: `notei_export_${format(new Date(), "yyyyMMdd_HHmm")}.zip`,
      filters: [{ name: "ZIP", extensions: ["zip"] }],
    });
    if (!filePath) return { filePath: null, failedPng };
    const buf = await blob.arrayBuffer();
    await writeFile(filePath, new Uint8Array(buf));
    return { filePath, failedPng };
  } catch {
    return { filePath: null, failedPng };
  }
}
