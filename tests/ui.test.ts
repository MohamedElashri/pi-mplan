import { describe, expect, it } from "vitest";
import {
  renderCreatePlanCall,
  renderCreatePlanResult,
  type CreatePlanDetails,
} from "../src/ui";

const theme = {
  fg: (c: string, s: string) => `[${c}]${s}[/${c}]`,
  bold: (s: string) => `[b]${s}[/b]`,
  dim: (s: string) => `[dim]${s}[/dim]`,
} as never;

const details: CreatePlanDetails = {
  written: [
    {
      path: "/tmp/proj/AGENTS.md",
      templateSource: "bundled",
      placeholdersRemaining: 2,
    },
    {
      path: "/tmp/proj/plan.md",
      templateSource: "project",
      placeholdersRemaining: 0,
    },
  ],
  projectTemplateDir: ".pi/pimplan",
  gitignore: { added: true, skipped: false },
  refinementQueued: true,
};

describe("ui renderers", () => {
  it("renderCreatePlanResult emits a header and per-file status", () => {
    const comp = renderCreatePlanResult({ details }, {} as never, theme, {});
    const lines = comp.render(80);
    const text = lines.join("\n");
    expect(text).toContain("create_plan");
    expect(text).toContain("AGENTS.md");
    expect(text).toContain("[warning]2 placeholders left for LLM");
    expect(text).toContain("plan.md");
    expect(text).toContain("[success]complete[/success]");
    expect(text).toContain("template dir: .pi/pimplan");
  });

  it("renderCreatePlanResult replaces content on a reused component", () => {
    const comp = renderCreatePlanResult(
      { details },
      { theme } as never,
      theme,
      {},
    );
    const first = comp.render(80).join("\n");
    const partial: CreatePlanDetails = {
      ...details,
      written: [],
      refinementQueued: false,
    };
    const reused = renderCreatePlanResult(
      { details: partial },
      { theme } as never,
      theme,
      { lastComponent: comp },
    );
    const second = reused.render(80).join("\n");
    expect(first).toContain("AGENTS.md");
    expect(second).not.toContain("AGENTS.md");
  });

  it("renderCreatePlanCall shows the selected target", () => {
    const comp = renderCreatePlanCall({ target: "agents" }, theme, {});
    const text = comp.render(80).join("\n");
    expect(text).toContain("target: agents");
  });

  it("renderCreatePlanCall default target is all", () => {
    const comp = renderCreatePlanCall(undefined, theme, {});
    expect(comp.render(80).join("\n")).toContain("target: all");
  });

  it("renderCreatePlanResult falls back gracefully without details", () => {
    const comp = renderCreatePlanResult({}, { theme } as never, theme, {});
    expect(comp.render(80).join("\n")).toContain("create_plan");
    expect(comp.render(80).join("\n")).not.toContain("placeholders");
  });
});
