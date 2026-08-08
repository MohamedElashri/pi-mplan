/**
 * Custom TUI rendering for the create_plan tool.
 *
 * Returns theme-aware `Component`s so tool results read like a status pane
 * (colored counts, bold titles) instead of a dump of plain text. Missing or
 * undefined render details degrade to a compact one-line summary.
 *
 * This module intentionally avoids importing `pi-tui` runtime classes: `Text`
 * is a peer runtime of the host and the interface we need is just
 * `{ render(width): string[] }`, so we implement it structurally.
 */
import type {
  Theme,
  ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";

/** Minimal viewport-renderable component (structural subset of pi-tui `Component`). */
export interface Renderable {
  render(width: number): string[];
  invalidate(): void;
}

/** Structured render details produced by create_plan. */
export interface CreatePlanDetails {
  written: Array<{
    path: string;
    templateSource: string;
    placeholdersRemaining: number;
  }>;
  projectTemplateDir: string;
  gitignore?: { added: boolean; skipped: boolean };
  refinementQueued: boolean;
}

/** Context slice the renderers read from the real pi call/result context. */
export type RenderContext = {
  lastComponent?: Renderable;
  expanded?: boolean;
  isPartial?: boolean;
  args?: { target?: string };
};

/** Theme-aware text box. */
class ColoredText implements Renderable {
  private text = "";
  private lastWidth = -1;
  private lastLines: string[] = [];

  setText(text: string): void {
    this.text = text;
    this.lastWidth = -1;
  }

  invalidate(): void {
    this.lastWidth = -1;
  }

  render(width: number): string[] {
    if (width !== this.lastWidth) {
      this.lastWidth = width;
      this.lastLines = this.text.split("\n");
    }
    return this.lastLines;
  }
}

function componentOrNew(context: RenderContext): ColoredText {
  const existing = context.lastComponent;
  const component =
    existing instanceof ColoredText ? existing : new ColoredText();
  return component;
}

function renderWrittenFile(
  file: CreatePlanDetails["written"][number],
  theme: Theme,
): string {
  const name = file.path.split(/[\\/]/).pop() ?? file.path;
  const template = theme.fg("muted", `[${file.templateSource}]`);
  const status =
    file.placeholdersRemaining === 0
      ? theme.fg("success", "complete")
      : theme.fg(
          "warning",
          `${file.placeholdersRemaining} placeholder${file.placeholdersRemaining === 1 ? "" : "s"} left for LLM`,
        );
  return [theme.bold(name), template, status].join(" ");
}

function buildDetailsText(details: CreatePlanDetails, theme: Theme): string {
  const lines: string[] = [
    theme.fg("toolTitle", theme.bold("create_plan")),
    "",
  ];
  for (const file of details.written) {
    lines.push(`  ${renderWrittenFile(file, theme)}`);
  }
  if (details.gitignore?.added) {
    lines.push(`  ${theme.fg("muted", "plan.md added to .gitignore")}`);
  } else if (details.gitignore?.skipped) {
    lines.push(`  ${theme.fg("muted", "no .gitignore present (skipped)")}`);
  }
  lines.push("");
  lines.push(
    `  ${theme.fg("muted", `template dir: ${details.projectTemplateDir}`)}`,
  );
  if (details.refinementQueued) {
    lines.push(
      theme.fg(
        "dim",
        "  refinement queued — review the follow-up to complete the files.",
      ),
    );
  }
  return lines.join("\n");
}

export function renderCreatePlanCall(
  args: { target?: string } | undefined,
  theme: Theme,
  context: RenderContext,
): Renderable {
  const target = args?.target ?? "all";
  const text = [
    theme.fg("toolTitle", theme.bold("create_plan")),
    theme.fg("muted", `target: ${target}`),
  ].join(" ");
  const component = componentOrNew(context);
  component.setText(text);
  return component;
}

export function renderCreatePlanResult(
  result: { details?: CreatePlanDetails | undefined },
  _options: ToolRenderResultOptions,
  theme: Theme,
  context: RenderContext,
): Renderable {
  const component = componentOrNew(context);
  component.setText(
    result.details
      ? buildDetailsText(result.details, theme)
      : [
          theme.fg("toolTitle", theme.bold("create_plan")),
          theme.fg(
            "muted",
            "  see result for scaffold summary (no render details)",
          ),
        ].join("\n"),
  );
  return component;
}
