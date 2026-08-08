import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateScaffolds, resolveTargets } from "../src/core/orchestrate";
import { loadTemplate } from "../src/core/templates";
import { ensureGitIgnore } from "../src/core/atomic";

describe("generateScaffolds", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "pi-mplan-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        name: "e2e",
        scripts: { build: "tsc", test: "vitest run" },
      }),
    );
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes plan.md and AGENTS.md when target is all", () => {
    const outcome = generateScaffolds(dir, resolveTargets("all"));
    expect(outcome.written.map((w) => w.path)).toEqual([
      join(dir, "AGENTS.md"),
      join(dir, "plan.md"),
    ]);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, "plan.md"))).toBe(true);
    const agents = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("# AGENTS.md");
    expect(agents).toContain("npm run build");
  });

  it("writes only plan.md for target plan", () => {
    const dir2 = mkdtempSync(join(tmpdir(), "pi-mplan-plan-"));
    try {
      writeFileSync(join(dir2, "package.json"), "{}");
      const out = generateScaffolds(dir2, resolveTargets("plan"));
      expect(out.written).toHaveLength(1);
      expect(existsSync(join(dir2, "plan.md"))).toBe(true);
      expect(existsSync(join(dir2, "AGENTS.md"))).toBe(false);
    } finally {
      rmSync(dir2, { recursive: true, force: true });
    }
  });

  it("reports remaining placeholders per written file", () => {
    const out = generateScaffolds(dir, resolveTargets("all"));
    for (const w of out.written) {
      expect(w.placeholdersRemaining).toBeGreaterThan(0);
    }
    const agents = out.written.find((w) => w.path.endsWith("AGENTS.md"))!;
    expect(
      out.written.find((w) => w.path.endsWith("plan.md"))!.templateSource,
    ).toBeDefined();
    expect(agents.content).toContain("npm run build");
  });
});

describe("ensureGitIgnore", () => {
  it("adds plan.md when .gitignore exists and lacks it", () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-mplan-gi-"));
    try {
      writeFileSync(join(dir, ".gitignore"), "node_modules/\n");
      const result = ensureGitIgnore(dir);
      expect(result.added).toBe(true);
      const content = readFileSync(join(dir, ".gitignore"), "utf8");
      expect(content).toContain("plan.md");
      expect(content).toContain("plan*");
      // Idempotent
      const second = ensureGitIgnore(dir);
      expect(second.added).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("skips when no .gitignore exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-mplan-gi2-"));
    try {
      const result = ensureGitIgnore(dir);
      expect(result.skipped).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("loadTemplate", () => {
  it("falls back to bundled when no project/user template exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-mplan-tpl-"));
    try {
      const t = loadTemplate(dir, "plan");
      expect(t.source).toBe("bundled");
      expect(t.content).toContain("# Implementation Plan");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("prefers a project template over bundled", () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-mplan-tpl2-"));
    try {
      mkdirSync(join(dir, ".pi", "pimplan"), { recursive: true });
      writeFileSync(join(dir, ".pi", "pimplan", "plan.md"), "# Custom", "utf8");
      const t = loadTemplate(dir, "plan");
      expect(t.source).toBe("project");
      expect(t.content).toBe("# Custom");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
