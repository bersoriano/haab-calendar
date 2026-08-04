import type { Lang } from "@/lib/types";

export function parsePublicLanguage(value?: string): Lang | undefined {
  return value === "en" || value === "es" ? value : undefined;
}

export function withPublicLanguage(path: string, lang?: Lang): string {
  if (!lang) return path;

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}lang=${lang}`;
}
