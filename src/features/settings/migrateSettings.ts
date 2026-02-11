import type { Settings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

export const SETTINGS_SCHEMA_VERSION = 4;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

export function migrateSettings(raw: unknown): Settings {
  const o = isRecord(raw) ? raw : {};
  const themeMode = o.themeMode === "system" || o.themeMode === "light" || o.themeMode === "dark"
    ? o.themeMode
    : DEFAULT_SETTINGS.themeMode;
  const exportRaw = isRecord(o.export) ? o.export : {};
  const defaultFormat = exportRaw.defaultFormat === "png" || exportRaw.defaultFormat === "md" || exportRaw.defaultFormat === "json"
    ? exportRaw.defaultFormat
    : DEFAULT_SETTINGS.export.defaultFormat;
  const autosaveRaw = isRecord(o.autosave) ? o.autosave : {};
  const autosaveMode = autosaveRaw.mode === "off" || autosaveRaw.mode === "afterDelay" || autosaveRaw.mode === "onFocusChange"
    ? autosaveRaw.mode
    : DEFAULT_SETTINGS.autosave.mode;
  const delayMs = typeof autosaveRaw.delayMs === "number" && autosaveRaw.delayMs >= 200 && autosaveRaw.delayMs <= 10000
    ? autosaveRaw.delayMs
    : DEFAULT_SETTINGS.autosave.delayMs;
  const launchAtStartup = typeof o.launchAtStartup === "boolean" ? o.launchAtStartup : DEFAULT_SETTINGS.launchAtStartup;
  const runInBackground = typeof o.runInBackground === "boolean" ? o.runInBackground : DEFAULT_SETTINGS.runInBackground;
  return {
    themeMode,
    export: {
      includeBrandHeader: typeof exportRaw.includeBrandHeader === "boolean" ? exportRaw.includeBrandHeader : DEFAULT_SETTINGS.export.includeBrandHeader,
      defaultFormat,
      exportPngAlwaysLight: typeof exportRaw.exportPngAlwaysLight === "boolean" ? exportRaw.exportPngAlwaysLight : DEFAULT_SETTINGS.export.exportPngAlwaysLight,
    },
    autosave: {
      mode: autosaveMode,
      delayMs,
    },
    launchAtStartup,
    runInBackground,
  };
}
