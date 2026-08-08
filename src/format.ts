/**
 * Plain-text status rendering for command/tool output.
 */
import type { GenerateOutcome } from "./core/orchestrate";
import type { InitResult } from "./core/templates";
import type { FileVerification } from "./core/verify";
import type { SyncResult } from "./core/sync";

export function formatOutcome(o: GenerateOutcome): string {
  const lines: string[] = ["pi-mplan: wrote scaffold(s)", ""];
  for (const w of o.written) {
    const placeholders = w.placeholdersRemaining;
    const todo =
      placeholders === 0
        ? "all placeholders filled"
        : `${placeholders} placeholder${placeholders === 1 ? "" : "s"} left for LLM`;
    lines.push(`  ${w.path} [template: ${w.templateSource}] (${todo})`);
  }
  if (o.gitignore) {
    if (o.gitignore.added)
      lines.push(`  ${o.gitignore.file}: added plan.md ignore rule`);
    else if (o.gitignore.skipped)
      lines.push(`  ${o.gitignore.file}: no .gitignore present (skipped)`);
    else lines.push(`  ${o.gitignore.file}: plan.md already ignored`);
  }
  lines.push("");
  lines.push(`Template dir: ${o.projectTemplateDir}`);
  lines.push("");
  if (o.refinements.length > 0) {
    lines.push(
      "Next: run /mplan plan, agents, or all to refine with the LLM (or ask the agent to complete the files).",
    );
  } else {
    lines.push(
      "Scaffold-only mode: files marked TODO are left for the agent/you to complete.",
    );
  }
  return lines.join("\n");
}

/** Notify level for a generation outcome. Scaffolds with leftover placeholders are partial → warning. */
export function outcomeNotifyLevel(o: GenerateOutcome): "info" | "warning" {
  return o.written.some((w) => w.placeholdersRemaining > 0)
    ? "warning"
    : "info";
}

/** Notify level for a verification run. */
export function verificationNotifyLevel(
  checks: FileVerification[],
): "info" | "warning" {
  return checks.some((c) => c.missing.length > 0) ? "warning" : "info";
}

/** Notify level for a template sync. */
export function syncNotifyLevel(r: SyncResult): "info" | "warning" {
  return r.failed.length > 0 ? "warning" : "info";
}

export function formatInitResult(r: InitResult): string {
  const lines: string[] = ["pi-mplan: project templates initialized"];
  lines.push(`  dir: ${r.dir}`);
  if (r.created.length) {
    lines.push("  created (seeded from " + r.seededFrom + "):");
    for (const c of r.created) lines.push(`    ${c}`);
  }
  if (r.existing.length) {
    lines.push("  left unchanged (already present):");
    for (const e of r.existing) lines.push(`    ${e}`);
  }
  return lines.join("\n");
}

export function helpText(): string {
  return [
    "pi-mplan — generate plan.md and AGENTS.md from your templates",
    "",
    "Generate:",
    "  /mplan                Generate + refine both plan.md and AGENTS.md",
    "  /mplan plan           Generate + refine plan.md only",
    "  /mplan agents         Generate + refine AGENTS.md only",
    "  /mplan scaffold       Write deterministic scaffolds only (no LLM step)",
    "",
    "Templates:",
    "  /mplan init           Copy default templates into .pi/pimplan/ for customization",
    "  /mplan sync           Pull personal templates from your agentic repo to ~/.pi/mplan",
    "",
    "Check:",
    "  /mplan verify         Report leftover placeholders in plan.md / AGENTS.md",
    "  /mplan help           Show this help",
  ].join("\n");
}

export function formatVerifyResult(checks: FileVerification[]): string {
  const lines: string[] = ["pi-mplan: verification"];
  let overallOk = true;
  for (const check of checks) {
    if (check.missing.length === 0) {
      lines.push(`  ${check.path}: complete (no placeholders)`);
    } else {
      overallOk = false;
      lines.push(
        `  ${check.path}: ${check.missing.length} placeholder(s) remaining`,
      );
      for (const hit of check.missing.slice(0, 10)) {
        lines.push(`    L${hit.line}: ${hit.text}`);
      }
      if (check.missing.length > 10) {
        lines.push(`    …and ${check.missing.length - 10} more`);
      }
    }
  }
  lines.push("");
  lines.push(
    overallOk
      ? "All generated files are complete."
      : "Run /mplan plan (or agents) again to refine the remaining placeholders, or complete them manually.",
  );
  return lines.join("\n");
}

export function formatSyncResult(r: SyncResult): string {
  const lines: string[] = ["pi-mplan: template sync"];
  if (r.fetched.length) {
    lines.push("  fetched:");
    for (const f of r.fetched) lines.push(`    ${f}`);
  }
  if (r.failed.length) {
    lines.push("  failed:");
    for (const f of r.failed) lines.push(`    ${f}`);
  }
  lines.push(`  target dir: ${r.targetDir}`);
  lines.push(`  bytes: ${r.totalBytes}`);
  if (r.failed.length === 0) {
    lines.push(
      "  Your personal templates are now used as the default until a project overrides them.",
    );
  }
  return lines.join("\n");
}
