import { loadStore } from "@/lib/store";
import type { Settings } from "./types";
import { migrateSettings, SETTINGS_SCHEMA_VERSION } from "./migrateSettings";

const STORE_PATH = "settings.json";

let store: Awaited<ReturnType<typeof loadStore>> | null = null;

async function getStore() {
  if (!store) {
    store = await loadStore(STORE_PATH, { autoSave: 300 });
  }
  return store;
}

export async function getSettings(): Promise<Settings> {
  const s = await getStore();
  const raw = await s.get<Settings>("settings");
  const version = await s.get<number>("settingsSchemaVersion");
  const settings = migrateSettings(raw);
  if (version !== SETTINGS_SCHEMA_VERSION) {
    await s.set("settings", settings);
    await s.set("settingsSchemaVersion", SETTINGS_SCHEMA_VERSION);
    await s.save();
  }
  return settings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  const s = await getStore();
  await s.set("settings", settings);
  await s.save();
}
