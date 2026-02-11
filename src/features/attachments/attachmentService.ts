import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/core";
import { mkdir, writeFile, remove, readDir, exists } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import { isTauri } from "@/lib/tauri";
import type { NoteAttachment } from "@/features/notes/types";
import { v4 as uuid } from "uuid";

const ATTACHMENTS_DIR = "attachments";
const CLEANUP_CHUNK_SIZE = 10;
const CLEANUP_MAX_PER_RUN = 100;

function extFromMime(mime: string): string {
  if (mime.startsWith("image/png")) return "png";
  if (mime.startsWith("image/jpeg") || mime.startsWith("image/jpg")) return "jpg";
  if (mime.startsWith("image/webp")) return "webp";
  if (mime.startsWith("image/gif")) return "gif";
  return "png";
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

export async function saveAttachment(
  noteId: string,
  file: File
): Promise<{ attachment: NoteAttachment; assetUrl: string } | null> {
  if (!isTauri()) return null;
  const id = uuid();
  const mime = file.type || "image/png";
  const ext = extFromMime(mime);
  const filename = file.name || `image.${ext}`;
  const relativePath = `${ATTACHMENTS_DIR}/${noteId}/${id}.${ext}`;
  const dirPath = `${ATTACHMENTS_DIR}/${noteId}`;
  try {
    const dirExists = await exists(dirPath, { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await mkdir(dirPath, { baseDir: BaseDirectory.AppData, recursive: true });
    }
    const buf = await file.arrayBuffer();
    await writeFile(relativePath, new Uint8Array(buf), {
      baseDir: BaseDirectory.AppData,
    });
    const base = await appDataDir();
    const fullPath = await join(base, relativePath);
    const assetUrl = convertFileSrc(fullPath);
    const { width, height } = await loadImageDimensions(file);
    const attachment: NoteAttachment = {
      id,
      type: "image",
      path: relativePath,
      filename,
      mime,
      width,
      height,
      createdAt: new Date().toISOString(),
    };
    return { attachment, assetUrl };
  } catch {
    return null;
  }
}

export async function getAttachmentAssetUrl(relativePath: string): Promise<string> {
  if (!isTauri()) return "";
  try {
    const base = await appDataDir();
    const fullPath = await join(base, relativePath);
    return convertFileSrc(fullPath);
  } catch {
    return "";
  }
}

export async function deleteNoteAttachments(noteId: string): Promise<void> {
  if (!isTauri()) return;
  const dirPath = `${ATTACHMENTS_DIR}/${noteId}`;
  try {
    const dirExists = await exists(dirPath, { baseDir: BaseDirectory.AppData });
    if (dirExists) {
      await remove(dirPath, { baseDir: BaseDirectory.AppData, recursive: true });
    }
  } catch {
  }
}

export type CleanupOrphanOptions = {
  signal?: AbortSignal;
  maxPerRun?: number;
  chunkSize?: number;
};

function scheduleIdle(cb: () => void) {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 0);
  }
}

export function runCleanupOrphanAttachments(
  noteIds: Set<string>,
  options: CleanupOrphanOptions = {}
): void {
  if (!isTauri()) return;
  const signal = options.signal;
  const maxPerRun = options.maxPerRun ?? CLEANUP_MAX_PER_RUN;
  const chunkSize = options.chunkSize ?? CLEANUP_CHUNK_SIZE;

  const run = () => {
    if (signal?.aborted) return;
    exists(ATTACHMENTS_DIR, { baseDir: BaseDirectory.AppData })
      .then((dirExists) => {
        if (!dirExists || signal?.aborted) return;
        return readDir(ATTACHMENTS_DIR, { baseDir: BaseDirectory.AppData });
      })
      .then((entries) => {
        if (!entries || signal?.aborted) return;
        const orphanDirs = entries
          .filter((e) => e.isDirectory && e.name && !noteIds.has(e.name))
          .map((e) => e.name)
          .slice(0, maxPerRun) as string[];
        if (orphanDirs.length === 0) return;

        let removed = 0;
        const processChunk = (start: number) => {
          if (signal?.aborted) return;
          const end = Math.min(start + chunkSize, orphanDirs.length);
          const batch = orphanDirs.slice(start, end);
          Promise.all(
            batch.map((name) =>
              remove(`${ATTACHMENTS_DIR}/${name}`, {
                baseDir: BaseDirectory.AppData,
                recursive: true,
              })
            )
          ).then(() => {
            removed += batch.length;
            if (removed < orphanDirs.length && !signal?.aborted) {
              scheduleIdle(() => processChunk(end));
            }
          }).catch(() => {});
        };
        scheduleIdle(() => processChunk(0));
      })
      .catch(() => {});
  };

  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => scheduleIdle(run));
  } else {
    scheduleIdle(run);
  }
}
