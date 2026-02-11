export type ThemeMode = "system" | "light" | "dark";

export type ExportDefaultFormat = "png" | "md" | "json";

export type AutosaveMode = "off" | "afterDelay" | "onFocusChange";

export type Settings = {
  themeMode: ThemeMode;
  export: {
    includeBrandHeader: boolean;
    defaultFormat: ExportDefaultFormat;
    exportPngAlwaysLight?: boolean;
  };
  autosave: {
    mode: AutosaveMode;
    delayMs: number;
  };
  launchAtStartup: boolean;
  runInBackground: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  themeMode: "light",
  export: {
    includeBrandHeader: true,
    defaultFormat: "png",
    exportPngAlwaysLight: false,
  },
  autosave: {
    mode: "afterDelay",
    delayMs: 1000,
  },
  launchAtStartup: false,
  runInBackground: false,
};
