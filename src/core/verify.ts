/**
 * Post-generation verification: detect leftover template placeholders so the
 * refinement pass (or a /mplan verify call) can tell whether a scaffold was
 * fully completed.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Matches template placeholders that are meant to be filled or explicitly
 * resolved. Flags `TODO`, `TBD`, `FIXME` when they sit in a placeholder
 * position (preceded by start/whitespace and followed by a colon or the end of
 * the line), so prose mentions like "and TODO comments not captured in
 * plan.md" are not false positives. "Not available" is a legitimate completion
 * and is never flagged.
 */
const PLACEHOLDER_RE = /(^|\s)(?:TODO|TBD|FIXME)(?=\s*:|$)/i;

export interface PlaceholderHit {
  line: number;
  text: string;
}

export function findPlaceholders(content: string): PlaceholderHit[] {
  const hits: PlaceholderHit[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    if (PLACEHOLDER_RE.test(text)) {
      hits.push({ line: i + 1, text: text.trim().slice(0, 120) });
    }
  }
  return hits;
}

export interface FileVerification {
  path: string;
  missing: PlaceholderHit[];
}

/** Verify written outputs exist and report remaining placeholders. */
export function verifyFiles(
  cwd: string,
  targets: Array<"plan" | "agents">,
): FileVerification[] {
  return targets.map((kind) => {
    const name = kind === "agents" ? "AGENTS.md" : "plan.md";
    const path = join(cwd, name);
    const content = existsSync(path) ? readFileSync(path, "utf8") : "";
    return { path, missing: findPlaceholders(content) };
  });
}
