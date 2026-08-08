# pi-mplan Configuration

## Overview

`pi-mplan` renders two files from templates:

| File | Purpose | Default output |
| --- | --- | --- |
| `AGENTS.md` | Repository-specific instructions for coding agents | `AGENTS.md` |
| `plan.md` | Private implementation ledger for the current task | `plan.md` |

Templates resolve at three levels, with decreasing priority:

| Level | Location | Scope | When it applies |
| --- | --- | --- | --- |
| Project | `<repo>/.pi/pimplan/` | That repository only | Always, if present |
| User | `~/.pi/mplan/` | Every project on this machine | When the project has no copy |
| Bundled | shipped with pi-mplan | Fallback default | When neither exists |

Run `/mplan init` to materialize the project-level copies (seeded from the
best available source above). Run `/mplan sync` to pull your personal
templates from the `agentic` repo into `~/.pi/mplan/`; synced files become the
global default for projects without their own templates.

## Generated files and safety

- Files are written to the project root.
- Writes are **atomic** (temp file + rename); an interrupted run never leaves a
  half-written file.
- When a `.gitignore` already exists, `plan.md` (and `plan*`) is appended to it
  so your private implementation ledger is not committed accidentally.
- In dialog-capable hosts (TUI/RPC), `/mplan` asks **before regenerating** a
  `plan.md`/`AGENTS.md` that already exists, so your edits are never silently
  overwritten.

## Command reference

| Command | Action |
| --- | --- |
| `/mplan` | Generate + refine both `plan.md` and `AGENTS.md` |
| `/mplan plan` | Generate/refine `plan.md` only |
| `/mplan agents` | Generate/refine `AGENTS.md` only |
| `/mplan init` | Copy default templates into `.pi/pimplan/` for customization |
| `/mplan scaffold` | Write deterministic scaffolds only (no LLM step) |
| `/mplan verify` | Report leftover placeholders in the generated files |
| `/mplan sync` | Pull personal templates from the `agentic` repo to `~/.pi/mplan/` |
| `/mplan help` | Show help |

### Tool usage

The `create_plan` tool is registered so the agent can generate files on its
own. Call it with `target: all | plan | agents`. Pass `scaffoldTemplates: true`
to also materialize the project templates first.

## UI & safety behavior

The extension improves the interaction with the host UI:

- **Overwrite guard** (details above under "Generated files"). When
  `plan.md`/`AGENTS.md` already exist, `/mplan` asks for confirmation before
  regenerating them, so your existing edits are never silently clobbered
  (dialog modes only).
- **Status feedback**: the host status bar shows
  "scanning repo..." / "pulling templates..." while work runs, then clears.
- **Color-coded results**: the `create_plan` tool renders a theme-aware
  summary (bold filenames, green when complete, amber when placeholders remain).
- **Notify levels**: scaffold/verify results with leftover placeholders are
  routed to the appropriate severity so you can spot incomplete files quickly.

## Placeholders

The generator fills placeholders it can answer deterministically from the
repository and leaves the rest as `TODO` for the LLM refinement step (or for
you to complete manually). A placeholder may also be left as `Not available`
when the concept does not apply.

| Placeholder | Filled from | Example |
| --- | --- | --- |
| Project name / description | `package.json` `name`/`description`, README intro | `my-lib` |
| Repository Layout | top-level directories and manifests | `src/`, `tests/`, `Cargo.toml` |
| Development Commands | per-toolchain commands (below) | `cargo test` |
| Package manager | lockfile (`pnpm-lock.yaml`, `yarn.lock`, …) | `pnpm` |

### Toolchain detection

Commands in the scaffold are detected from the actual repo, not hard-coded to
npm:

| Toolchain | Detected from | Example commands |
| --- | --- | --- |
| npm/yarn/pnpm | `package.json` + lockfile | `npm run build` / `npm run test` |
| Cargo | `Cargo.toml` | `cargo build` / `cargo test` / `cargo clippy` |
| Go | `go.mod` | `go mod tidy` / `go test ./...` |
| Python | `pyproject.toml` / `requirements.txt` | `uv sync` / `pytest` / `ruff check` |
| Make | `Makefile` | `make build` / `make fmt` |

Where a `.env.example` exists, setup may include an env-seeding step.

## Template layout guide

### `AGENTS.md`

- **Project Summary**: what the project does, who uses it, main
  language/runtime, domain constraints.
- **Repository Layout**: top-level structure.
- **Development Commands**: exact setup/build/test/lint/format/run (or
  `Not available`).
- **Working Rules**: files to read before editing, when to create `plan.md`.
- **Implementation Rules**: diff size, naming, determinism, dependencies.
- **Testing**: narrowest-first validation strategy.
- **Documentation**: when to update user-facing docs vs. private `plan.md`.
- **Special Constraints**: security/performance/compat/data/deployment.

### `plan.md`

- **Goal / Scope / Constraints**: final outcome and boundaries.
- **Current State**: relevant files, existing behavior, commands, risks.
- **Commands**: setup/build/test/lint/format/run.
- **Acceptance Criteria / Test Plan**: how you know the task is done.
- **Phases 0-2**: orientation, implementation, validation; each with
  deliverables, acceptance criteria, and status/completion/deviation notes.

Customize any section in your `.pi/pimplan/*.md` files; the generator preserves
your structure and only substitutes the recognized placeholders listed above.

## Verifying completion

Run `/mplan verify` (or read the placeholder counts in the tool output) to see
which `TODO`/`TBD`/`FIXME` markers remain in each generated file. The check
ignores `Not available` and prose mentions of keywords; only placeholder-style
occurrences (`TODO: …`, `- TODO`, `1. TBD: …`) are reported.