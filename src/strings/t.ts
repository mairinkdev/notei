import { en } from "./en";

type Nested = Record<string, unknown>;
const dict: Nested = en as Nested;

function get(obj: Nested, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const key of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Nested)[key];
  }
  return typeof current === "string" ? current : undefined;
}

export function t(path: string): string {
  const value = get(dict, path);
  return value ?? path;
}

export function tReplace(path: string, replacements: Record<string, string>): string {
  let out = t(path);
  for (const [key, value] of Object.entries(replacements)) {
    out = out.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return out;
}
