type StoreLike = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<void>;
  save: () => Promise<void>;
};

const BROWSER_KEY_PREFIX = "notei-store-";

async function browserStore(path: string): Promise<StoreLike> {
  const key = BROWSER_KEY_PREFIX + path.replace(/\W/g, "_");
  const data: Record<string, unknown> = {};
  try {
    const raw = localStorage.getItem(key);
    if (raw) Object.assign(data, JSON.parse(raw));
  } catch {
  }
  return {
    async get<T>(k: string): Promise<T | null> {
      return (data[k] as T) ?? null;
    },
    async set(k: string, value: unknown): Promise<void> {
      data[k] = value;
      localStorage.setItem(key, JSON.stringify(data));
    },
    async save(): Promise<void> {},
  };
}

export async function loadStore(path: string, _opts?: { autoSave?: number }): Promise<StoreLike> {
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    const s = await load(path, {
      defaults: {},
      autoSave: _opts?.autoSave ?? 400,
    });
    return s as unknown as StoreLike;
  } catch {
    return browserStore(path);
  }
}
