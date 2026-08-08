/**
 * Atomic filesystem helpers.
 *
 * Writes go through a temp file + rename so a crash mid-write never leaves a
 * truncated plan.md / AGENTS.md behind.
 */
import { dirname, join, basename } from "node:path";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  renameSync,
  readFileSync,
  rmSync,
} from "node:fs";

export function atomicWrite(path: string, content: string): void {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  writeFileSync(tmp, content, "utf8");
  try {
    renameSync(tmp, path);
  } catch (err) {
    try {
      if (existsSync(tmp)) rmSync(tmp, { force: true });
    } catch {
      /* ignore */
    }
    throw err;
  }
}

/**
 * Ensure `plan.md` (and its `plan*` glob) is ignored by git, matching the
 * suggestion in the AGENTS.md template. Only touches an existing `.gitignore`;
 * does not create one.
 */
export function ensureGitIgnore(cwd: string): {
  skipped: boolean;
  added: boolean;
  file: string;
} {
  const file = join(cwd, ".gitignore");
  if (!existsSync(file)) return { skipped: true, added: false, file };

  let content = readFileSync(file, "utf8");

  const hasPlanMark = /(^|\n)(plan\*|plan\.md)(\n|$)/m.test(content);
  if (hasPlanMark) return { skipped: false, added: false, file };

  if (content.length && !content.endsWith("\n")) content += "\n";
  content += "# plan.md: private implementation ledger\nplan.md\n";
  // Keep the general glob so future plan-named files stay ignored too.
  content += "plan*\n";
  atomicWrite(file, content);
  return { skipped: false, added: true, file };
}
