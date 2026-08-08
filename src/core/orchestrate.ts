/**
 * High-level orchestration exposed to both the command and the tool.
 * Produces deterministic scaffolds on disk (guaranteed output even without an
 * LLM), then builds the refinement instruction for agent/model touch-up.
 *
 * Writes are atomic (temp + rename) and plan.md is added to `.gitignore` when
 * a gitignore already exists. Each written file also carries a count of
 * remaining template placeholders so callers can verify completion.
 */
import { analyzeRepo, type RepoFacts } from "./repo";
import { atomicWrite, ensureGitIgnore } from "./atomic";
import { generateAgents, generatePlan, type GeneratedFile } from "./generate";
import { describeTemplatesDir, loadTemplate } from "./templates";
import { findPlaceholders } from "./verify";
import {
  buildAgentsRefineInstruction,
  buildPlanRefinementInstruction,
} from "./instructions";

export interface RefinementStep {
  path: string;
  instruction: string;
}

export interface WrittenFile extends GeneratedFile {
  /** Number of template placeholders that could not be filled without an LLM. */
  placeholdersRemaining: number;
}

export interface GenerateOutcome {
  cwd: string;
  facts: RepoFacts;
  written: WrittenFile[];
  projectTemplateDir: string;
  refinements: RefinementStep[];
  /** Result of ensuring plan.md is git-ignored. */
  gitignore: {
    skipped: boolean;
    added: boolean;
    file: string;
  };
}

function buildFile(file: GeneratedFile): WrittenFile {
  return {
    ...file,
    placeholdersRemaining: findPlaceholders(file.content).length,
  };
}

export function generateScaffolds(
  cwd: string,
  targets: Array<"plan" | "agents">,
): GenerateOutcome {
  const facts = analyzeRepo(cwd);
  const written: WrittenFile[] = [];
  const refinements: RefinementStep[] = [];

  const git = ensureGitIgnore(cwd);

  if (targets.includes("agents")) {
    const template = loadTemplate(cwd, "agents");
    const file = buildFile(generateAgents(cwd, facts, template));
    atomicWrite(file.path, file.content);
    written.push(file);
    refinements.push({
      path: file.path,
      instruction: buildAgentsRefineInstruction(cwd, facts, template),
    });
  }

  if (targets.includes("plan")) {
    const template = loadTemplate(cwd, "plan");
    const file = buildFile(generatePlan(cwd, facts, template));
    atomicWrite(file.path, file.content);
    written.push(file);
    refinements.push({
      path: file.path,
      instruction: buildPlanRefinementInstruction(cwd, template),
    });
  }

  const projectTemplateDir = describeTemplatesDir(cwd);

  return {
    cwd,
    facts,
    written,
    projectTemplateDir,
    refinements,
    gitignore: git,
  };
}

export function resolveTargets(
  kind: "plan" | "agents" | "all",
): Array<"plan" | "agents"> {
  if (kind === "all") return ["plan", "agents"];
  return [kind];
}
