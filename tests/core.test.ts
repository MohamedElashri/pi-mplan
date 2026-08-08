import { describe, expect, it } from "vitest";
import { analyzeRepo } from "../src/core/repo";
import { renderPlan, renderAgents } from "../src/core/generate";
import { findPlaceholders } from "../src/core/verify";

const FIXTURES = `${__dirname}/fixtures`;
const ROOT = `${FIXTURES}/basic-project`;

describe("analyzeRepo", () => {
  it("detects the package name and description", () => {
    const facts = analyzeRepo(ROOT);
    expect(facts.name).toBe("basic-project");
    expect(facts.description).toBe(
      "A minimal example project used for testing pi-mplan.",
    );
    expect(facts.packageManager).toBe("npm");
  });

  it("detects layout directories and manifests", () => {
    const facts = analyzeRepo(ROOT);
    expect(facts.layout).toContain("src");
    expect(facts.layout).toContain("tests");
    expect(facts.manifests).toContain("package.json");
  });

  it("maps package scripts to command sections", () => {
    const facts = analyzeRepo(ROOT);
    expect(facts.commands.build).toContain("build");
    expect(facts.commands.test).toContain("test");
    expect(facts.commands.run).toBeUndefined();
  });

  it("extracts a readme intro line", () => {
    const facts = analyzeRepo(ROOT);
    expect(facts.readmeIntro).toContain("sample");
  });
});

describe("analyzeRepo: multi-toolchain detection", () => {
  it("detects Cargo commands", () => {
    const facts = analyzeRepo(`${FIXTURES}/mplan-cargo`);
    expect(facts.packageManager).toBe("cargo");
    expect(facts.commands.build).toBe("cargo build");
    expect(facts.commands.lint).toBe("cargo clippy");
    expect(facts.manifests).toContain("Cargo.toml");
  });

  it("detects Go commands", () => {
    const facts = analyzeRepo(`${FIXTURES}/mplan-go`);
    expect(facts.packageManager).toBe("go");
    expect(facts.commands.test).toBe("go test ./...");
    expect(facts.commands.setup).toBe("go mod tidy");
    expect(facts.layout).toContain("cmd");
  });

  it("detects Python commands", () => {
    const facts = analyzeRepo(`${FIXTURES}/mplan-py`);
    expect(facts.packageManager).toBe("python");
    expect(facts.commands.test).toBe("pytest");
    expect(facts.commands.lint).toContain("ruff");
  });

  it("detects Makefile targets", () => {
    const facts = analyzeRepo(`${FIXTURES}/mplan-make`);
    expect(facts.packageManager).toBe("make");
    expect(facts.commands.build).toBe("make build");
    expect(facts.commands.format).toBe("make fmt");
  });
});

describe("renderPlan", () => {
  it("fills commands into the template", () => {
    const facts = analyzeRepo(ROOT);
    const out = renderPlan(facts);
    expect(out).toContain("# build");
    expect(out).toContain("npm run build");
    expect(out).toContain("## Goal");
  });
});

describe("renderAgents", () => {
  it("fills the layout block and summary", () => {
    const facts = analyzeRepo(ROOT);
    const out = renderAgents(facts);
    expect(out).toContain("src/");
    expect(out).toContain(
      "A minimal example project used for testing pi-mplan.",
    );
    expect(out).toContain("## Special Constraints");
  });
});

describe("findPlaceholders", () => {
  it("flags TODO/TBD/FIXME but not Not available", () => {
    const content = [
      "## Goal",
      "TODO: describe the outcome",
      "- Not available",
      "## Risks",
      "TBD",
      "FIXME: fix",
    ].join("\n");
    const hits = findPlaceholders(content);
    expect(hits).toHaveLength(3);
    expect(hits.map((h) => h.line)).toEqual([2, 5, 6]);
  });

  it("returns empty for a complete file", () => {
    expect(findPlaceholders("# done\nall good\nNot available")).toHaveLength(0);
  });

  it("does not flag prose mentions of TODO/TBD in a non-placeholder position", () => {
    const content = [
      "Avoid placeholder code and TODO comments not captured in plan.md.",
      "The plan tracks every todo in the backlog; a fixme can be filed, and any",
      "tbd that comes up is resolved before landing.",
    ].join("\n");
    expect(findPlaceholders(content)).toHaveLength(0);
  });

  it("flags numbered or bulleted placeholder forms", () => {
    const content = [
      "- TODO",
      "1. TBD: narrow targeted check",
      "## Risks\n\tFIXME",
    ].join("\n");
    const hits = findPlaceholders(content);
    expect(hits).toHaveLength(3);
    expect(hits.map((h) => h.line)).toEqual([1, 2, 4]);
  });
});
