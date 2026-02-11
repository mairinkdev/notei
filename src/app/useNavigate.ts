import { useCallback } from "react";
import type { Section } from "@/app/AppShell";

export function useNavigate(): (
  section: Section,
  noteId?: string
) => void {
  const dispatch = (window as unknown as { __noteiNavigate?: (s: Section, id?: string) => void }).__noteiNavigate;
  return useCallback(
    (section: Section, noteId?: string) => {
      dispatch?.(section, noteId);
    },
    [dispatch]
  );
}

export function setNavigateHandler(handler: (section: Section, noteId?: string) => void): void {
  (window as unknown as { __noteiNavigate?: (s: Section, id?: string) => void }).__noteiNavigate = handler;
}
