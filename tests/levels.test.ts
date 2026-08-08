import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateScaffolds } from "../src/core/orchestrate";
import {
  outcomeNotifyLevel,
  verificationNotifyLevel,
  syncNotifyLevel,
} from "../src/format";
import type { GenerateOutcome } from "../src/core/orchestrate";
import { registerPimplanCommand } from "../src/commands/pimplan";

function makeHarness(confirm: boolean) {
  const notified: Array<{ message: string; level?: string }> = [];
  const statuses: Array<string | undefined> = [];
  let handler: ((args: string, ctx: any) => Promise<void>) | undefined;

  const pi = {
    registerCommand: (_name: string, opts: any) => {
      handler = opts.handler;
    },
    registerTool: () => {},
    sendUserMessage: async () => {},
  };
  registerPimplanCommand(pi as never);

  const bind = (cwd: string, hasUI: boolean) => {
    const ctx = {
      cwd,
      hasUI,
      ui: {
        notify: (message: string, level?: string) =>
          notified.push({ message, level }),
        confirm: async () => confirm,
        setStatus: (_key: string, text?: string) => statuses.push(text),
      },
    };
    return ctx;
  };

  return {
    notify: notified,
    statuses,
    bind,
    run: async (cwd: string, hasUI: boolean, args = "") => {
      await handler!(args, bind(cwd, hasUI));
    },
  };
}

describe("notify level mappings", () => {
  let dir: string;
  let outcome: GenerateOutcome;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "pi-mplan-lvl-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "lvl", scripts: {} }),
    );
    outcome = generateScaffolds(dir, ["plan", "agents"]);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("scaffold outcome with leftover placeholders is warning", () => {
    expect(outcomeNotifyLevel(outcome)).toBe("warning");
  });

  it("complete outcome (no placeholders) is info", () => {
    const complete: GenerateOutcome = {
      ...outcome,
      written: outcome.written.map((w) => ({
        ...w,
        content: "no todos here",
        placeholdersRemaining: 0,
      })),
    };
    expect(outcomeNotifyLevel(complete)).toBe("info");
  });

  it("verification with missing checks is warning, clean is info", () => {
    expect(
      verificationNotifyLevel([
        { path: "a", missing: [{ line: 1, text: "TODO" }] },
      ]),
    ).toBe("warning");
    expect(verificationNotifyLevel([{ path: "a", missing: [] }])).toBe("info");
  });

  it("sync with failures is warning, clean is info", () => {
    expect(
      syncNotifyLevel({
        fetched: [],
        failed: ["boom"],
        targetDir: "x",
        totalBytes: 0,
      }),
    ).toBe("warning");
    expect(
      syncNotifyLevel({
        fetched: ["a"],
        failed: [],
        targetDir: "x",
        totalBytes: 1,
      }),
    ).toBe("info");
  });
});

describe("registerPimplanCommand UI flows", () => {
  it("regenerates with confirmation when user approves", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-mplan-cmd-"));
    try {
      writeFileSync(join(dir, "plan.md"), "# existing plan\n", "utf8");
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ name: "cmd", scripts: {} }),
      );
      const h = makeHarness(true);
      await h.run(dir, true, "plan");
      expect(h.notify.some((n) => n.message.includes("wrote scaffold"))).toBe(
        true,
      );
      expect(h.notify.some((n) => n.level === "warning")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("skips generation when user declines the overwrite", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-mplan-cmd2-"));
    try {
      writeFileSync(join(dir, "plan.md"), "# existing plan\n", "utf8");
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ name: "cmd2", scripts: {} }),
      );
      const h = makeHarness(false);
      await h.run(dir, true, "plan");
      expect(h.notify.some((n) => n.message.includes("Nothing changed"))).toBe(
        true,
      );
      expect(h.notify.some((n) => n.message.includes("scaffold"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes immediately when no UI is available (print/json mode)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-mplan-cmd3-"));
    try {
      writeFileSync(join(dir, "plan.md"), "# existing plan\n", "utf8");
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ name: "cmd3", scripts: {} }),
      );
      const h = makeHarness(false);
      await h.run(dir, false, "plan");
      expect(h.notify.some((n) => n.message.includes("wrote scaffold"))).toBe(
        true,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("states a status line during generation then clears it", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-mplan-cmd4-"));
    try {
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ name: "cmd4", scripts: {} }),
      );
      const h = makeHarness(true);
      await h.run(dir, true, "all");
      expect(h.statuses[0]).toContain("scanning");
      expect(h.statuses[h.statuses.length - 1]).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
