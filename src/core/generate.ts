/**
 * Deterministic scaffold: fills template placeholders that can be answered from
 * repo facts alone. Everything an LLM is needed for remains as TODO so the LLM
 * refinement passes can target them.
 */
import { DEFAULT_AGENTS_TEMPLATE, DEFAULT_PLAN_TEMPLATE } from "../templates";
import { agentsOutPath, planOutPath } from "./paths";
import type { RepoFacts } from "./repo";

export { DEFAULT_AGENTS_TEMPLATE, DEFAULT_PLAN_TEMPLATE };

export interface GeneratedFile {
  /** Path the file should be written to (project root). */
  path: string;
  /** Rendered content. */
  content: string;
  /** True when the active template came from the project, not the bundle. */
  templateSource: "project" | "user" | "bundled";
}

function cmdLine(command: string | undefined): string {
  return command ? command : "TODO";
}

function manifestBlock(facts: RepoFacts): string {
  const lines = [...facts.layout.map((d) => `${d}/`), ...facts.manifests];
  if (lines.length === 0) return "TODO";
  return lines.join("\n");
}

/** Fill placeholders in the AGENTS.md template from repo facts. */
export function renderAgents(
  facts: RepoFacts,
  template: string = DEFAULT_AGENTS_TEMPLATE,
): string {
  const summary =
    facts.description ||
    facts.readmeIntro ||
    `${facts.name} — TODO: describe what the project does, who uses it, main language/runtime, and important domain constraints.`;
  return template
    .replace(
      /TODO: Describe in 2-5 sentences:[\s\S]*?- Important domain constraints\./,
      summary,
    )
    .replace(
      /```text\nTODO\n```/,
      () => `\`\`\`text\n${manifestBlock(facts)}\n\`\`\``,
    )
    .replace(
      /# setup\nTODO\n\n# build\nTODO\n\n# test\nTODO\n\n# lint\nTODO\n\n# format\nTODO\n\n# run locally\nTODO/,
      [
        "# setup",
        cmdLine(facts.commands.setup),
        "",
        "# build",
        cmdLine(facts.commands.build),
        "",
        "# test",
        cmdLine(facts.commands.test),
        "",
        "# lint",
        cmdLine(facts.commands.lint),
        "",
        "# format",
        cmdLine(facts.commands.format),
        "",
        "# run locally",
        cmdLine(facts.commands.run),
      ].join("\n"),
    );
}

/** Fill placeholders in the plan.md template from repo facts. */
export function renderPlan(
  facts: RepoFacts,
  template: string = DEFAULT_PLAN_TEMPLATE,
): string {
  const currentState = [
    `- Relevant files: ${facts.manifests.join(", ") || "TODO"}`,
    `- Existing behavior: TODO`,
    `- Known commands: ${facts.packageManager || "Not available"}`,
    `- Risks: TODO`,
  ].join("\n");
  return template
    .replace(
      /```bash\n# setup\nTODO\n\n# build\nTODO\n\n# test\nTODO\n\n# lint\/format\nTODO\n\n# run\nTODO\n```/,
      [
        "```bash",
        "# setup",
        cmdLine(facts.commands.setup),
        "",
        "# build",
        cmdLine(facts.commands.build),
        "",
        "# test",
        cmdLine(facts.commands.test),
        "",
        "# lint/format",
        cmdLine(facts.commands.lint),
        "",
        "# run",
        cmdLine(facts.commands.run),
        "```",
      ].join("\n"),
    )
    .replace(
      /- Relevant files: TODO\n- Existing behavior: TODO\n- Known commands: TODO\n- Risks: TODO/,
      currentState,
    );
}

export function generateAgents(
  cwd: string,
  facts: RepoFacts,
  template: { content: string; source: "project" | "user" | "bundled" },
): GeneratedFile {
  return {
    path: agentsOutPath(cwd),
    content: renderAgents(facts, template.content),
    templateSource: template.source,
  };
}

export function generatePlan(
  cwd: string,
  facts: RepoFacts,
  template: { content: string; source: "project" | "user" | "bundled" },
): GeneratedFile {
  return {
    path: planOutPath(cwd),
    content: renderPlan(facts, template.content),
    templateSource: template.source,
  };
}
