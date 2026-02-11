import { openUrl as tauriOpenUrl, openPath as tauriOpenPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { writeImage, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { isTauri } from "@/lib/tauri";
import { t } from "@/strings/t";
import { toPng } from "html-to-image";

const SHARE_LINKS: { name: string; url: string }[] = [
  { name: "WhatsApp", url: "https://web.whatsapp.com" },
  { name: "Slack", url: "https://slack.com" },
  { name: "Discord", url: "https://discord.com" },
  { name: "Telegram", url: "https://web.telegram.org" },
];

export function getShareInstructions(): string {
  return t("share.instructions");
}

export function getShareLinks(): { name: string; url: string }[] {
  return SHARE_LINKS;
}

export async function copyImageToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      backgroundColor: "var(--bg)",
    });
    if (isTauri()) {
      const base64 = dataUrl.split(",")[1];
      if (!base64) return false;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      await writeImage(bytes);
      return true;
    }
    const blob = await fetch(dataUrl).then((r) => r.blob());
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (isTauri()) {
      await writeText(text);
      return true;
    }
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function openUrl(url: string): Promise<void> {
  if (isTauri()) {
    await tauriOpenUrl(url);
    return;
  }
  window.open(url, "_blank");
}

export async function revealInFolder(path: string): Promise<void> {
  if (!isTauri()) return;
  await revealItemInDir(path);
}

export async function openPath(path: string): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await tauriOpenPath(path);
}
