/**
 * Deterministic repo facts used to pre-fill template placeholders without an LLM.
 *
 * Supports npm/pnpm/yarn/bun (package.json), make (Makefile), Rust (Cargo.toml),
 * Python (pyproject.toml / requirements.txt), and Go (go.mod) projects.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

export interface RepoFacts {
  /** Project name from package.json or the directory basename. */
  name: string;
  /** Description from package.json, if present. */
  description?: string;
  /** Top-level directories, for the Repository Layout block. */
  layout: string[];
  /** Manifest files present at the repo root. */
  manifests: string[];
  /** Notable top-level config/docs files. */
  notableFiles: string[];
  /** Auto-detected commands grouped by common script name. */
  commands: Record<string, string | undefined>;
  /** The toolchain detected (npm, cargo, make, go, python, …). */
  packageManager?: string;
  /** First non-empty non-heading line of the README, if any. */
  readmeIntro?: string;
}

const LOCK_TO_PM: Array<[string, string]> = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["bun.lockb", "bun"],
  ["uv.lock", "uv"],
  ["poetry.lock", "poetry"],
  ["Cargo.lock", "cargo"],
  ["go.sum", "go"],
];

/** Maps each command section to a list of plausible script/target names. */
const SECTION_ALIASES: Record<string, string[]> = {
  setup: ["setup", "install", "bootstrap", "prepare"],
  build: ["build", "compile", "dist"],
  test: ["test", "check", "vitest", "jest", "test:run"],
  lint: ["lint", "lint:check", "check"],
  format: ["format", "fmt", "pretty"],
  run: ["run", "dev", "start", "serve"],
};

/** Matches directories that usually hold source/domain content. */
const LAYOUT_RE =
  /^(src|lib|app|tests?|spec|packages|apps|scripts|docs?|examples?|cmd|internal|public|web|server|client|core|config|assets)$/;

const MANIFEST_RE =
  /package\.json$|Cargo\.toml$|pyproject\.toml$|go\.mod$|pom\.xml$|build\.gradle$/;

function detectPackageManager(root: string): string | undefined {
  for (const [lock, pm] of LOCK_TO_PM) {
    if (existsSync(join(root, lock))) return pm;
  }
  return undefined;
}

function hasFile(root: string, ...names: string[]): boolean {
  return names.some((n) => existsSync(join(root, n)));
}

function listDirs(root: string): string[] {
  try {
    return readdirSync(root)
      .filter((entry) => {
        try {
          return statSync(join(root, entry)).isDirectory();
        } catch {
          return false;
        }
      })
      .filter((dir) => !dir.startsWith(".") && dir !== "node_modules");
  } catch {
    return [];
  }
}

function listFiles(root: string): string[] {
  try {
    return readdirSync(root).filter((entry) => {
      try {
        return statSync(join(root, entry)).isFile();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

function readJson<T>(path: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function readFile(root: string, name: string): string | undefined {
  const path = join(root, name);
  try {
    return existsSync(path) ? readFileSync(path, "utf8") : undefined;
  } catch {
    return undefined;
  }
}

/** Find the first matching alias for a section among a set of candidate names. */
function pickAlias(
  section: string,
  candidateNames: string[],
): string | undefined {
  for (const alias of SECTION_ALIASES[section] ?? []) {
    if (candidateNames.includes(alias)) return alias;
  }
  return undefined;
}

/** npm-style: fill sections from package.json scripts. */
function detectNpmCommands(root: string): Record<string, string> | undefined {
  const pkg = readJson<{ scripts?: Record<string, string> }>(
    join(root, "package.json"),
  );
  if (!pkg?.scripts) return undefined;
  const pm = detectPackageManager(root) ?? "npm";
  const commands: Record<string, string> = {};
  for (const section of Object.keys(SECTION_ALIASES)) {
    const alias = pickAlias(section, Object.keys(pkg.scripts));
    if (alias) commands[section] = `${pm} run ${alias}`;
  }
  return commands;
}

/** Makefile: match top-level targets like `build:`, `test:`, `fmt:`. */
function detectMakeCommands(root: string): Record<string, string> | undefined {
  const text = readFile(root, "Makefile");
  if (!text) return undefined;
  const targets = new Set<string>();
  for (const line of text.split("\n")) {
    const m = line.match(/^([\w.-]+)\s*:/);
    if (m && !line.includes("=")) targets.add(m[1]);
  }
  const commands: Record<string, string> = {};
  for (const section of Object.keys(SECTION_ALIASES)) {
    const target = pickAlias(section, [...targets]);
    if (target) commands[section] = `make ${target}`;
  }
  return commands;
}

/** Rust: standard cargo commands. */
function detectCargoCommands(root: string): Record<string, string> | undefined {
  if (!hasFile(root, "Cargo.toml")) return undefined;
  return {
    setup: "cargo build",
    build: "cargo build",
    test: "cargo test",
    lint: "cargo clippy",
    format: "cargo fmt",
    run: "cargo run",
  };
}

/** Python: uv / poetry / pip based on lockfile presence. */
function detectPythonCommands(
  root: string,
): Record<string, string> | undefined {
  if (!hasFile(root, "pyproject.toml", "requirements.txt", "setup.py"))
    return undefined;
  const pm = detectPackageManager(root);
  const prefix = pm === "uv" || pm === "poetry" ? pm : "python -m";
  const commands: Record<string, string> = {
    setup:
      pm === "uv"
        ? "uv sync"
        : pm === "poetry"
          ? "poetry install"
          : "pip install -r requirements.txt",
    build: `${prefix} build`,
    test: prefix === "python -m" ? "pytest" : `${prefix} run pytest`,
    lint: `${prefix} ruff check .`,
    format: `${prefix} ruff format .`,
  };
  if (prefix === "python -m") delete commands.setup;
  return commands;
}

/** Go: standard go toolchain commands. */
function detectGoCommands(root: string): Record<string, string> | undefined {
  if (!hasFile(root, "go.mod")) return undefined;
  return {
    setup: "go mod tidy",
    build: "go build ./...",
    test: "go test ./...",
    lint: "golangci-lint run",
    format: "gofmt -l .",
    run: "go run .",
  };
}

function readReadmeIntro(root: string): string | undefined {
  const candidates = ["README.md", "readme.md", "README", "README.MD"];
  const actual = candidates.find((c) => existsSync(join(root, c)));
  if (!actual) return undefined;
  const text = readFile(root, actual);
  if (!text) return undefined;
  return text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#"));
}

/**
 * Detect commands across toolchains, by priority:
 * npm scripts → Makefile → Cargo → Python → Go. The first non-empty answer
 * per section wins.
 */
function detectCommands(root: string): Record<string, string | undefined> {
  const sources: Array<() => Record<string, string> | undefined> = [
    () => detectNpmCommands(root),
    () => detectMakeCommands(root),
    () => detectCargoCommands(root),
    () => detectPythonCommands(root),
    () => detectGoCommands(root),
  ];
  const commands: Record<string, string | undefined> = {};
  for (const source of sources) {
    const detected = source();
    if (!detected) continue;
    for (const section of Object.keys(SECTION_ALIASES)) {
      if (commands[section] === undefined && detected[section]) {
        commands[section] = detected[section];
      }
    }
  }
  return commands;
}

function resolvePackageManager(root: string): string | undefined {
  const pm = detectPackageManager(root);
  if (pm) return pm;
  if (hasFile(root, "package.json")) return "npm";
  if (hasFile(root, "Cargo.toml")) return "cargo";
  if (hasFile(root, "go.mod")) return "go";
  if (hasFile(root, "pyproject.toml", "requirements.txt", "setup.py"))
    return "python";
  if (hasFile(root, "Makefile")) return "make";
  return undefined;
}

export function analyzeRepo(root: string): RepoFacts {
  const dirs = listDirs(root);
  const files = listFiles(root);
  const pkg = readJson<{ name?: string; description?: string }>(
    join(root, "package.json"),
  );

  const name = pkg?.name?.trim() || basename(root) || "my-project";
  const description = pkg?.description?.trim() || undefined;

  return {
    name,
    description,
    layout: dirs.filter((d) => LAYOUT_RE.test(d)),
    manifests: files.filter((f) => MANIFEST_RE.test(f)),
    notableFiles: files.filter((f) =>
      /^(README|CONTRIBUTING|CHANGELOG|LICENSE|Makefile|Dockerfile|\.env\.example)/i.test(
        f,
      ),
    ),
    commands: detectCommands(root),
    packageManager: resolvePackageManager(root),
    readmeIntro: readReadmeIntro(root),
  };
}
