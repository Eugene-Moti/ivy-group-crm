/**
 * Workspace (organisation) branding — shared by server and client code.
 *
 * Each company on Orion sets its own name, initials, tagline, logo and an
 * accent colour. The accent is picked from a fixed set rather than a free
 * colour picker: every preset was checked for at least 4.5:1 contrast with
 * white button text in both themes, so no workspace can make its own
 * buttons unreadable.
 */

export type AccentKey = "evergreen" | "sapphire" | "terracotta" | "plum" | "ocean" | "ruby";

export const ACCENTS: Record<AccentKey, { label: string; light: string; dark: string }> = {
  evergreen: { label: "Evergreen", light: "#1a6a40", dark: "#23824f" },
  sapphire: { label: "Sapphire", light: "#1f5f99", dark: "#2a6db0" },
  ocean: { label: "Ocean", light: "#0f6670", dark: "#127580" },
  terracotta: { label: "Terracotta", light: "#a8442a", dark: "#b84a2c" },
  ruby: { label: "Ruby", light: "#9b2c3f", dark: "#ad3348" },
  plum: { label: "Plum", light: "#6b3f8f", dark: "#7a4aa3" },
};

export function isAccentKey(value: unknown): value is AccentKey {
  return typeof value === "string" && value in ACCENTS;
}

export type Workspace = {
  id: string | null;
  name: string;
  shortName: string;
  tagline: string | null;
  logoUrl: string | null;
  accent: AccentKey;
};

/** Used until the branding migration runs, and whenever it can't be read. */
export const DEFAULT_WORKSPACE: Workspace = {
  id: null,
  name: "Ivy Group",
  shortName: "IG",
  tagline: null,
  logoUrl: null,
  accent: "evergreen",
};

export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * CSS that re-points the primary colour at the workspace's accent. Only
 * --primary changes: chart colours stay on the validated chart palette.
 * Evergreen is the built-in default, so it needs no override at all.
 */
export function accentCss(accent: AccentKey): string {
  if (accent === "evergreen") return "";
  const { light, dark } = ACCENTS[accent];
  return `:root{--primary:${light};--brand:${light};}.dark{--primary:${dark};--brand:${dark};}`;
}
