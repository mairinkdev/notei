import { useState, useEffect, useCallback } from "react";
import { isTauri } from "@/lib/tauri";
import { t } from "@/strings/t";

export type AutostartStatus = "enabled" | "disabled" | null;

export function useStartupSync(launchAtStartup: boolean | undefined) {
  const [autostartStatus, setAutostartStatus] = useState<AutostartStatus>(null);
  const [autostartToast, setAutostartToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri() || launchAtStartup === undefined) return;
    let cancelled = false;
    import("@tauri-apps/plugin-autostart")
      .then(({ isEnabled, enable, disable }) => {
        return isEnabled().then((enabled) => {
          if (cancelled) return;
          setAutostartStatus(enabled ? "enabled" : "disabled");
          if (launchAtStartup && !enabled) return enable();
          if (!launchAtStartup && enabled) return disable();
        });
      })
      .then(() =>
        import("@tauri-apps/plugin-autostart").then(({ isEnabled }) =>
          isEnabled().then((enabled) => {
            if (!cancelled) setAutostartStatus(enabled ? "enabled" : "disabled");
          })
        )
      )
      .catch(() => {
        if (!cancelled) setAutostartToast(t("settings.autostartFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [launchAtStartup]);

  const clearToast = useCallback(() => setAutostartToast(null), []);

  return { autostartStatus, autostartToast, clearToast };
}
