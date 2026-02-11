import { useEffect, useState, useCallback } from "react";
import { getSettings, saveSettings } from "@/features/settings/repository";
import type { Settings, ThemeMode, ExportDefaultFormat, AutosaveMode } from "@/features/settings/types";
import { useTheme } from "@/theme/themeContext";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Card } from "@/components/ui/Card";
import { isTauri } from "@/lib/tauri";
import { useStartupSync } from "@/app/useStartupSync";
import { t } from "@/strings/t";

export function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setMode } = useTheme();
  const { autostartStatus, autostartToast, clearToast } = useStartupSync(settings?.launchAtStartup);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof Error ? e.message : t("notes.failedToLoad")))
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      if (patch.themeMode !== undefined) setMode(patch.themeMode);
      if (patch.launchAtStartup !== undefined && isTauri()) clearToast();
      setSettings((prev) => {
        if (!prev) return null;
        const next = { ...prev, ...patch };
        saveSettings(next).catch(() => {});
        return next;
      });
    },
    [setMode, clearToast]
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--bg)]">
        <p className="text-sm text-[var(--text-secondary)]">{t("notes.loading")}</p>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[var(--bg)]">
        <p className="text-sm text-red-500">{error ?? t("settings.failedToLoad")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[var(--bg)] p-8">
      <h2 className="mb-6 text-xl font-medium text-[var(--text)]">{t("settings.title")}</h2>
      <div className="max-w-md space-y-6">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-[var(--text)]">
            {t("settings.theme")}
          </h3>
          <SegmentedControl<ThemeMode>
            options={[
              { value: "system", label: t("settings.system") },
              { value: "light", label: t("settings.light") },
              { value: "dark", label: t("settings.dark") },
            ]}
            value={settings.themeMode}
            onChange={(v) => update({ themeMode: v })}
          />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-[var(--text)]">
            {t("settings.general")}
          </h3>
          {isTauri() && (
            <div className="space-y-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.launchAtStartup}
                  onChange={(e) => update({ launchAtStartup: e.target.checked })}
                  className="rounded border-[var(--surface-border)]"
                />
                <span className="text-sm text-[var(--text)]">
                  {t("settings.launchAtStartup")}
                </span>
              </label>
              {autostartStatus !== null && (
                <p className="text-xs text-[var(--text-secondary)]">
                  {autostartStatus === "enabled" ? t("settings.enabled") : t("settings.disabled")}
                </p>
              )}
              {autostartToast && (
                <p className="text-xs text-[var(--text-secondary)]">
                  {autostartToast}
                </p>
              )}
              <label className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.runInBackground}
                  onChange={(e) => update({ runInBackground: e.target.checked })}
                  className="rounded border-[var(--surface-border)]"
                />
                <span className="text-sm text-[var(--text)]">
                  {t("settings.runInBackground")}
                </span>
              </label>
              <p className="text-xs text-[var(--text-secondary)]">
                {t("settings.runInBackgroundHint")}
              </p>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-[var(--text)]">
            {t("settings.autosave")}
          </h3>
          <SegmentedControl<AutosaveMode>
            options={[
              { value: "off", label: t("settings.off") },
              { value: "afterDelay", label: t("settings.afterDelay") },
              { value: "onFocusChange", label: t("settings.onFocusChange") },
            ]}
            value={settings.autosave.mode}
            onChange={(v) =>
              update({
                autosave: { ...settings.autosave, mode: v },
              })
            }
            className="mb-3"
          />
          {settings.autosave.mode === "afterDelay" && (
            <div className="mt-2">
              <label className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)]">
                  {t("settings.delayMs")}
                </span>
                <input
                  type="range"
                  min={200}
                  max={5000}
                  step={100}
                  value={settings.autosave.delayMs}
                  onChange={(e) =>
                    update({
                      autosave: {
                        ...settings.autosave,
                        delayMs: Number(e.target.value),
                      },
                    })
                  }
                  className="h-2 w-32 rounded-full appearance-none bg-[var(--surface-border)] accent-[var(--accent)]"
                />
                <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                  {settings.autosave.delayMs}
                </span>
              </label>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-[var(--text)]">
            {t("settings.export")}
          </h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.export.exportPngAlwaysLight ?? false}
              onChange={(e) =>
                update({
                  export: {
                    ...settings.export,
                    exportPngAlwaysLight: e.target.checked,
                  },
                })
              }
              className="rounded border-[var(--surface-border)]"
            />
            <span className="text-sm text-[var(--text)]">
              {t("settings.exportPngAlwaysLight")}
            </span>
          </label>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.export.includeBrandHeader}
              onChange={(e) =>
                update({
                  export: {
                    ...settings.export,
                    includeBrandHeader: e.target.checked,
                  },
                })
              }
              className="rounded border-[var(--surface-border)]"
            />
            <span className="text-sm text-[var(--text)]">
              {t("settings.includeBrandHeader")}
            </span>
          </label>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {t("settings.defaultFormat")}
          </p>
          <SegmentedControl<ExportDefaultFormat>
            options={[
              { value: "png", label: "PNG" },
              { value: "md", label: "Markdown" },
              { value: "json", label: "JSON" },
            ]}
            value={settings.export.defaultFormat}
            onChange={(v) =>
              update({
                export: { ...settings.export, defaultFormat: v },
              })
            }
            className="mt-2"
          />
        </Card>
        <p className="mt-8 text-center text-xs text-[var(--text-secondary)] opacity-70">
          <a
            href="https://github.com/mairinkdev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-100 transition-opacity"
          >
            @mairinkdev
          </a>
        </p>
      </div>
    </div>
  );
}
