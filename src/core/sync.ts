/**
 * Template sync (improvement #5).
 *
 * When a project doesn't have its own templates and no personal templates
 * exist, pi-mplan can pull your canonical templates from the published
 * `MohamedElashri/agentic` repo so you don't ship a stale bundled copy.
 * Synced templates are stored at ~/.pi/mplan/ and reused automatically.
 */
import { existsSync } from "node:fs";
import * as path from "node:path";
import {
  userAgentsTemplatePath,
  userPlanTemplatePath,
  userTemplatesDir,
} from "./paths";
import { atomicWrite } from "./atomic";

export const AGENTIC_TEMPLATE_BASE =
  "https://raw.githubusercontent.com/MohamedElashri/agentic/main/templates";

export interface SyncResult {
  fetched: string[];
  failed: string[];
  targetDir: string;
  totalBytes: number;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

/** Pull the canonical AGENTS.md + plan.md from the agentic repo. */
export async function syncUserTemplates(
  baseUrl: string = AGENTIC_TEMPLATE_BASE,
): Promise<SyncResult> {
  const dir = userTemplatesDir();
  const targets: Array<[string, string]> = [
    ["AGENTS.md", `${baseUrl}/AGENTS.md`],
    ["plan.md", `${baseUrl}/plan.md`],
  ];
  const result: SyncResult = {
    fetched: [],
    failed: [],
    targetDir: dir,
    totalBytes: 0,
  };
  for (const [fileName, url] of targets) {
    try {
      const text = await fetchText(url);
      atomicWrite(path.join(dir, fileName), text);
      result.fetched.push(path.join(dir, fileName));
      result.totalBytes += Buffer.byteLength(text);
    } catch (err) {
      result.failed.push((err as Error).message);
    }
  }
  return result;
}

/** True when no personal templates exist yet (a good time to offer sync). */
export function shouldSyncUserTemplates(): boolean {
  return !(
    existsSync(userAgentsTemplatePath()) || existsSync(userPlanTemplatePath())
  );
}
