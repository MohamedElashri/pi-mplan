/**
 * Template loading.
 *
 * Resolution order for any kind:
 *   1. Project override  `<project>/.pi/pimplan/`
 *   2. Personal default  `~/.pi/mplan/`
 *   3. Bundled default   (shipped with pi-mplan)
 *
 * `init` scaffolds the project-local copies from the highest-available source
 * so each repo can diverge from your personal template.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  agentsTemplatePath,
  planTemplatePath,
  projectTemplatesDir,
  userAgentsTemplatePath,
  userPlanTemplatePath,
  userTemplatesDir,
} from "./paths";
import { DEFAULT_AGENTS_TEMPLATE, DEFAULT_PLAN_TEMPLATE } from "../templates";
import { PIMPLAN_DIR } from "./constants";

export interface Template {
  content: string;
  source: "project" | "user" | "bundled";
}

export type TargetKind = "plan" | "agents";

function readTemplate(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

/** Resolve the concrete path used for the merged refinement of a kind. */
function resolveTemplatePath(
  cwd: string,
  kind: TargetKind,
): { path: string; source: Template["source"] } | undefined {
  const projectPath =
    kind === "plan" ? planTemplatePath(cwd) : agentsTemplatePath(cwd);
  if (existsSync(projectPath)) return { path: projectPath, source: "project" };

  const userPath =
    kind === "plan" ? userPlanTemplatePath() : userAgentsTemplatePath();
  if (existsSync(userPath)) return { path: userPath, source: "user" };

  return undefined;
}

export function loadTemplate(cwd: string, kind: TargetKind): Template {
  const resolved = resolveTemplatePath(cwd, kind);
  if (resolved) {
    const content = readTemplate(resolved.path);
    if (content !== undefined) {
      return { content, source: resolved.source };
    }
  }
  return {
    content: kind === "plan" ? DEFAULT_PLAN_TEMPLATE : DEFAULT_AGENTS_TEMPLATE,
    source: "bundled",
  };
}

export interface InitResult {
  dir: string;
  created: string[];
  existing: string[];
  /** Where the seeded content came from (project/user/bundled). */
  seededFrom: Template["source"];
}

/**
 * Scaffold project-local template files under `.pi/pimplan/`. Does not
 * overwrite files that already exist. New files are seeded from the best
 * available source (personal template, falling back to bundled).
 */
export function initTemplates(cwd: string): InitResult {
  const dir = projectTemplatesDir(cwd);
  mkdirSync(dir, { recursive: true });
  const specs: Array<{ fileName: string; kind: TargetKind }> = [
    { fileName: "AGENTS.md", kind: "agents" },
    { fileName: "plan.md", kind: "plan" },
  ];
  const created: string[] = [];
  const existing: string[] = [];
  let seededFrom: Template["source"] = "bundled";

  for (const { kind } of specs) {
    const outPath =
      kind === "agents" ? agentsTemplatePath(cwd) : planTemplatePath(cwd);
    if (existsSync(outPath)) {
      existing.push(outPath);
      continue;
    }
    const template = loadTemplate(cwd, kind);
    if (template.source !== "bundled") {
      seededFrom = template.source;
    }
    writeFileSync(outPath, template.content, "utf8");
    created.push(outPath);
  }
  return { dir, created, existing, seededFrom };
}

export function userTemplatesPresent(): { agents: boolean; plan: boolean } {
  return {
    agents: existsSync(userAgentsTemplatePath()),
    plan: existsSync(userPlanTemplatePath()),
  };
}

export function describeTemplatesDir(cwd: string): string {
  const project = projectTemplatesDir(cwd);
  if (existsSync(project)) return project;
  const user = userTemplatesDir();
  if (existsSync(user)) return user;
  return `${PIMPLAN_DIR} (not yet created — run /mplan init)`;
}
