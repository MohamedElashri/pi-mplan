/**
 * /mplan command — generate plan.md and/or AGENTS.md for the current project.
 *
 * pi-mplan writes a deterministic scaffold from the best available template
 * (project → personal → bundled) and then, unless scaffold-only is requested,
 * queues LLM refinement so the running agent fills the remaining placeholders.
 * Also supports template init/sync and a verify pass that reports leftover
 * placeholders after generation.
 *
 * UI polish:
 *  - existing plan.md/AGENTS.md are only regenerated after a confirmation
 *    dialog when the host has dialog-capable UI (TUI/RPC), so your edits are
 *    never silently clobbered;
 *  - a transient status line shows what step is running;
 *  - results are routed to the matching notify level (info/warning/error).
 */
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionUIContext,
} from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import {
  generateScaffolds,
  resolveTargets,
  type GenerateOutcome,
} from "../core/orchestrate";
import { initTemplates } from "../core/templates";
import { syncUserTemplates } from "../core/sync";
import { verifyFiles } from "../core/verify";
import { agentsOutPath, planOutPath } from "../core/paths";
import {
  formatInitResult,
  formatOutcome,
  formatSyncResult,
  formatVerifyResult,
  helpText,
  outcomeNotifyLevel,
  syncNotifyLevel,
  verificationNotifyLevel,
} from "../format";

type Subcommand =
  "all" | "plan" | "agents" | "init" | "scaffold" | "verify" | "sync" | "help";

function completions(prefix: string) {
  const opts: Array<{ value: string; label: string }> = [
    { value: "all", label: "Generate + refine both plan.md and AGENTS.md" },
    { value: "plan", label: "Generate + refine plan.md only" },
    { value: "agents", label: "Generate + refine AGENTS.md only" },
    { value: "scaffold", label: "Deterministic scaffold only (no LLM step)" },
    { value: "init", label: "Copy project templates to .pi/pimplan/" },
    { value: "sync", label: "Pull personal templates from your agentic repo" },
    {
      value: "verify",
      label: "Report leftover placeholders in generated files",
    },
    { value: "help", label: "Show this help" },
  ];
  if (!prefix) return opts;
  return opts.filter((o) => o.value.startsWith(prefix.toLowerCase()));
}

function parseSubcommand(args: string): Subcommand {
  const trimmed = (typeof args === "string" ? args : "").trim();
  const sub = trimmed ? trimmed.toLowerCase() : "all";
  if (
    [
      "all",
      "plan",
      "agents",
      "init",
      "scaffold",
      "verify",
      "sync",
      "help",
    ].includes(sub)
  ) {
    return sub as Subcommand;
  }
  return "help";
}

/** Which of the requested target files already exist on disk? */
function existingTargets(
  cwd: string,
  targets: Array<"plan" | "agents">,
): string[] {
  return targets
    .map((t) => (t === "plan" ? planOutPath(cwd) : agentsOutPath(cwd)))
    .filter((p) => existsSync(p));
}

/**
 * Ask before regenerating files that already exist. Skips confirmation when
 * the host has no dialog-capable UI (print/json modes) — there the command
 * regenerates as before.
 */
async function confirmOverwrites(
  cwd: string,
  targets: Array<"plan" | "agents">,
  ui: ExtensionUIContext,
  hasUI: boolean,
): Promise<Array<"plan" | "agents">> {
  const existing = existingTargets(cwd, targets);
  if (existing.length === 0) return targets;
  if (!hasUI) return targets;

  const names = existing.map((p) => p.split(/[\\/]/).pop()).join(", ");
  const proceed = await ui.confirm(
    "pi-mplan",
    `Regenerate ${names}? Existing content will be overwritten.`,
  );
  return proceed ? targets : [];
}

function reportOutcome(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  outcome: GenerateOutcome,
): void {
  ctx.ui.notify(formatOutcome(outcome), outcomeNotifyLevel(outcome));
  if (outcome.refinements.length > 0) {
    const combined = outcome.refinements
      .map((r) => `--- ${r.path} ---\n${r.instruction}`)
      .join("\n\n");
    try {
      void Promise.resolve(
        pi.sendUserMessage([{ type: "text", text: combined }]),
      ).catch(() => {});
    } catch {
      /* no active session — scaffold still written */
    }
  }
}

export function registerPimplanCommand(pi: ExtensionAPI): void {
  pi.registerCommand("mplan", {
    description:
      "Generate plan.md and AGENTS.md for the current project from your templates. Run /mplan all, plan, agents, init, scaffold, sync, verify, or help.",
    getArgumentCompletions: completions,
    handler: async (args, ctx) => {
      const sub = parseSubcommand(args);

      if (sub === "help") {
        ctx.ui.notify(helpText(), "info");
        return;
      }

      if (sub === "init") {
        const result = initTemplates(ctx.cwd);
        ctx.ui.notify(formatInitResult(result), "info");
        return;
      }

      if (sub === "verify") {
        const checks = verifyFiles(ctx.cwd, ["plan", "agents"]);
        ctx.ui.notify(
          formatVerifyResult(checks),
          verificationNotifyLevel(checks),
        );
        return;
      }

      if (sub === "sync") {
        await syncWith(ctx);
        return;
      }

      // plan | agents | all | scaffold
      const targets =
        sub === "all" ? resolveTargets("all") : [sub as "plan" | "agents"];
      const allowed = await confirmOverwrites(
        ctx.cwd,
        targets,
        ctx.ui,
        ctx.hasUI,
      );
      if (allowed.length === 0) {
        ctx.ui.notify("Nothing changed — files left as-is.", "info");
        return;
      }

      ctx.ui.setStatus(
        "mplan",
        "pi-mplan: scanning repo and generating scaffold…",
      );
      try {
        const outcome = generateScaffolds(ctx.cwd, allowed);
        reportOutcome(pi, ctx, outcome);
      } finally {
        ctx.ui.setStatus("mplan", undefined);
      }
    },
  });
}

async function syncWith(ctx: ExtensionCommandContext): Promise<void> {
  ctx.ui.setStatus("mplan", "pi-mplan: pulling templates from agentic repo…");
  try {
    const result = await syncUserTemplates();
    ctx.ui.notify(formatSyncResult(result), syncNotifyLevel(result));
  } catch (err) {
    ctx.ui.notify(`Sync failed: ${(err as Error).message}`, "error");
  } finally {
    ctx.ui.setStatus("mplan", undefined);
  }
}
