import { useEffect, useState } from "react";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AppShell } from "@/app/AppShell";
import { IntroSplash } from "@/app/IntroSplash";

export function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setAppReady(true));
    });
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <ThemeProvider>
      <AppShell />
      {showIntro && (
        <IntroSplash
          isReady={appReady}
          onDone={() => setShowIntro(false)}
        />
      )}
    </ThemeProvider>
  );
}
