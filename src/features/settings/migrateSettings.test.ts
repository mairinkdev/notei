import { describe, it, expect } from "vitest";
import { migrateSettings } from "./migrateSettings";
import { DEFAULT_SETTINGS } from "./types";

describe("migrateSettings", () => {
  it("returns default settings for null/undefined", () => {
    expect(migrateSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(migrateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("merges partial raw with defaults", () => {
    const out = migrateSettings({ themeMode: "dark" });
    expect(out.themeMode).toBe("dark");
    expect(out.export.defaultFormat).toBe(DEFAULT_SETTINGS.export.defaultFormat);
    expect(out.export.includeBrandHeader).toBe(DEFAULT_SETTINGS.export.includeBrandHeader);
  });

  it("preserves valid export options", () => {
    const out = migrateSettings({
      themeMode: "system",
      export: {
        defaultFormat: "md",
        includeBrandHeader: false,
        exportPngAlwaysLight: true,
      },
    });
    expect(out.themeMode).toBe("system");
    expect(out.export.defaultFormat).toBe("md");
    expect(out.export.includeBrandHeader).toBe(false);
    expect(out.export.exportPngAlwaysLight).toBe(true);
  });

  it("ignores invalid themeMode and uses default", () => {
    const out = migrateSettings({ themeMode: "invalid" });
    expect(out.themeMode).toBe(DEFAULT_SETTINGS.themeMode);
  });
});
