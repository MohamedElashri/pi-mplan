import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  existsSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncUserTemplates, shouldSyncUserTemplates } from "../src/core/sync";
import { userTemplatesDir, userAgentsTemplatePath } from "../src/core/paths";
import { loadTemplate } from "../src/core/templates";

describe("syncUserTemplates", () => {
  let server: Server;
  let port: number;
  const originalHome = process.env.HOME;
  let fakeHome: string;

  beforeAll(async () => {
    fakeHome = mkdtempSync(join(tmpdir(), "pi-mplan-home-"));
    process.env.HOME = fakeHome;
    server = createServer((req, res) => {
      if (req.url?.startsWith("/templates/AGENTS.md")) {
        res.setHeader("content-type", "text/plain");
        res.end("# Synced Agents\n");
        return;
      }
      if (req.url?.startsWith("/templates/plan.md")) {
        res.setHeader("content-type", "text/plain");
        res.end("# Synced Plan\n");
        return;
      }
      res.statusCode = 404;
      res.end("nope");
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as { port: number }).port;
  });

  afterAll(async () => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    rmSync(fakeHome, { recursive: true, force: true });
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it("fetches templates into the user dir and reports failures for missing files", async () => {
    const result = await syncUserTemplates(
      `http://127.0.0.1:${port}/templates`,
    );
    expect(result.fetched).toHaveLength(2);
    expect(result.failed).toEqual([]);
    expect(result.totalBytes).toBeGreaterThan(0);
    expect(
      readFileSync(join(fakeHome, ".pi", "mplan", "AGENTS.md"), "utf8"),
    ).toContain("Synced Agents");
    expect(
      readFileSync(join(fakeHome, ".pi", "mplan", "plan.md"), "utf8"),
    ).toContain("Synced Plan");
  });

  it("records failures when a template is missing", async () => {
    const result = await syncUserTemplates(`http://127.0.0.1:${port}/missing`);
    expect(result.failed).toHaveLength(2);
    expect(result.fetched).toEqual([]);
  });

  it("it writes user templates to the path that loadTemplate resolves", async () => {
    await syncUserTemplates(`http://127.0.0.1:${port}/templates`);
    const t = loadTemplate(fakeHome, "plan");
    expect(t.source).toBe("user");
    expect(t.content).toContain("Synced Plan");
  });
});

describe("shouldSyncUserTemplates", () => {
  const originalHome = process.env.HOME;
  let fakeHome: string;

  afterAll(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("is true when no user templates exist", () => {
    fakeHome = mkdtempSync(join(tmpdir(), "pi-mplan-home2-"));
    process.env.HOME = fakeHome;
    expect(shouldSyncUserTemplates()).toBe(true);
    expect(existsSync(userTemplatesDir())).toBe(false);
  });

  it("is false once a user template exists", () => {
    mkdirSync(userTemplatesDir(), { recursive: true });
    writeFileSync(userAgentsTemplatePath(), "# x", "utf8");
    expect(shouldSyncUserTemplates()).toBe(false);
  });
});
