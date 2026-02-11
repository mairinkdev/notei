import { useEffect, useRef } from "react";
import { getSettings, saveSettings } from "./repository";
import { useTheme } from "@/theme/themeContext";
import type { ThemeMode } from "./types";

export function useThemeModeSync() {
  const { mode, setMode } = useTheme();
  const initialLoadDone = useRef(false);

  useEffect(() => {
    getSettings().then((s) => {
      setMode(s.themeMode as ThemeMode);
      initialLoadDone.current = true;
    });
  }, [setMode]);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    getSettings().then((s) => {
      if (s.themeMode === mode) return;
      saveSettings({ ...s, themeMode: mode }).catch(() => {});
    });
  }, [mode]);
}
