/**
 * Filesystem paths used by pi-mplan.
 *
 * Path convention:
 * - User templates live at `~/.pi/mplan/` (personal defaults).
 * - Project templates live at `<project>/.pi/pimplan/` (per-repo overrides).
 * - Generated artifacts are written to the project root (AGENTS.md, plan.md).
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { PIMPLAN_DIR, USER_DIR } from "./constants";

export function userTemplatesDir(): string {
  return join(homedir(), USER_DIR);
}

export function projectTemplatesDir(cwd: string): string {
  return join(cwd, PIMPLAN_DIR);
}

export function userAgentsTemplatePath(): string {
  return join(userTemplatesDir(), "AGENTS.md");
}

export function userPlanTemplatePath(): string {
  return join(userTemplatesDir(), "plan.md");
}

export function agentsTemplatePath(cwd: string): string {
  return join(projectTemplatesDir(cwd), "AGENTS.md");
}

export function planTemplatePath(cwd: string): string {
  return join(projectTemplatesDir(cwd), "plan.md");
}

export function agentsOutPath(cwd: string): string {
  return join(cwd, "AGENTS.md");
}

export function planOutPath(cwd: string): string {
  return join(cwd, "plan.md");
}
