/**
 * create_plan tool — agent-driven plan.md / AGENTS.md generation.
 *
 * Writes deterministic scaffolds for the requested targets and returns a
 * refinement instruction so the calling agent can complete them with real
 * project knowledge. Scaffolds are always written, so a valid file exists even
 * if the agent decides not to refine further.
 */
import type {
  ExtensionAPI,
  AgentToolResult,
} from "@earendil-works/pi-coding-agent";
import { generateScaffolds, resolveTargets } from "../core/orchestrate";
import { initTemplates } from "../core/templates";
import { formatOutcome } from "../format";
import {
  renderCreatePlanCall,
  renderCreatePlanResult,
  type CreatePlanDetails,
} from "../ui";

export function registerCreatePlanTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "create_plan",
    label: "Create plan/AGENTS",
    description:
      "Create or refresh plan.md and/or AGENTS.md for the current project. Reads the best available template (project .pi/pimplan/, personal ~/.pi/mplan/, or bundled), writes a deterministic scaffold atomically to the requested files, auto-ignores plan.md in git when a .gitignore exists, and returns a refinement instruction so the agent can complete remaining placeholders. Also reports how many placeholders remain in each file.",
    promptSnippet:
      "Use create_plan to scaffold plan.md / AGENTS.md for the current project from the templates. Pass target: plan, agents, or all.",
    promptGuidelines: [
      "When the user asks to create a plan or AGENTS.md for the repository, call create_plan with target 'all' (or 'plan'/'agents' for a single file). It writes the scaffold; then examine its output, especially the remaining-placeholder counts, and complete every TODO using real project knowledge.",
      "create_plan reports placeholders left per file. After refining a file, verify no TODO/placeholder remains unless it is legitimately marked 'Not available'.",
    ],
    parameters: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: ["plan", "agents", "all"],
          description:
            "Which file(s) to generate. 'all' generates both (default behavior).",
        },
        scaffoldTemplates: {
          type: "boolean",
          description:
            "Whether to init project template files (.pi/pimplan/) before generating. Default: false.",
        },
      },
      additionalProperties: false,
      required: ["target"],
    },
    async execute(
      _toolCallId,
      params,
      _signal,
      _onUpdate,
      ctx,
    ): Promise<AgentToolResult<CreatePlanDetails>> {
      try {
        const targets = resolveTargets(params.target ?? "all");
        if (params.scaffoldTemplates) {
          initTemplates(ctx.cwd);
        }
        const outcome = generateScaffolds(ctx.cwd, targets);
        const base = formatOutcome(outcome);

        const instructions = outcome.refinements
          .map((r) => `--- ${r.path} ---\n${r.instruction}`)
          .join("\n\n");

        const content = [
          base,
          "",
          "Refinement instructions:",
          instructions,
        ].join("\n");

        const details: CreatePlanDetails = {
          written: outcome.written.map((w) => ({
            path: w.path,
            templateSource: w.templateSource,
            placeholdersRemaining: w.placeholdersRemaining,
          })),
          projectTemplateDir: outcome.projectTemplateDir,
          gitignore: {
            added: outcome.gitignore.added,
            skipped: outcome.gitignore.skipped,
          },
          refinementQueued: outcome.refinements.length > 0,
        };
        return {
          content: [{ type: "text", text: content }],
          details,
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `create_plan failed: ${(err as Error).message}`,
            },
          ],
          details: {
            written: [],
            projectTemplateDir: "",
            refinementQueued: false,
          },
        };
      }
    },
    renderCall: renderCreatePlanCall,
    renderResult: renderCreatePlanResult,
  });
}
