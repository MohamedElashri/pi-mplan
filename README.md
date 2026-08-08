# pi-mplan

Plan + AGENTS.md generator extension for [Pi](https://github.com/earendil-works/pi-coding-agent).

`pi-mplan` automates creating `plan.md` and `AGENTS.md` for a project from your
own templates. It writes a deterministic scaffold derived from real repository
facts (package.json scripts, top-level layout, README) and then hands the model
a refinement instruction so the running agent completes the file with actual
project knowledge. If no LLM turn is available, the scaffold is still written,
so you always get a usable, template-shaped result.

## Features

- **`/mplan` command** — generate and refine files manually.
- **`create_plan` tool** — the agent can generate the files autonomously.
- **Three-level templates** — project (`.pi/pimplan/`), user
  (`~/.pi/mplan/`), then bundled defaults. Customize once, reuse everywhere.
- **Multi-toolchain detection** — npm, Cargo, Go, Python (uv/pytest/ruff),
  and Make, so commands in the scaffold match the repo.
- **Deterministic scaffold + LLM refinement** — guaranteed output even without
  a live agent turn, with LLM touch-up to fill the semantic placeholders.
- **Verification** — `/mplan verify` and per-file placeholder counts report
  what is left to complete.
- **Template sync** — pull your canonical `AGENTS.md`/`plan.md` from the
  `agentic` repo to `~/.pi/mplan/`.
- **Safe writes** — atomic file replacement and auto-ignoring `plan.md` in
  `.gitignore` when one exists.

## Install

```bash
pi install npm:pi-mplan
```

Or from a local checkout during development:

```bash
pnpm build
pnpm pack
pi install ./pi-mplan-0.1.0.tgz
```

## Usage

### Command

| Command | Action |
| --- | --- |
| `/mplan` | Scaffold + refine both `plan.md` and `AGENTS.md` |
| `/mplan plan` | Generate/refine `plan.md` only |
| `/mplan agents` | Generate/refine `AGENTS.md` only |
| `/mplan init` | Copy the default templates into `.pi/pimplan/` for customization |
| `/mplan scaffold` | Write deterministic scaffolds only (no LLM step) |
| `/mplan verify` | Report leftover placeholders in the generated files |
| `/mplan sync` | Pull your personal templates from the `agentic` repo to `~/.pi/mplan/` |
| `/mplan help` | Show help |

Generated files are written to the project root (and `plan.md` is added to a
`.gitignore` when one exists). Templates resolve at three levels with
decreasing priority: project (`.pi/pimplan/`), user (`~/.pi/mplan/`), then the
bundled defaults.

### UI & safety

- **Overwrite guard** — when `plan.md`/`AGENTS.md` already exist, `/mplan`
  asks for confirmation before regenerating them (dialog modes only, so your
  existing edits are never silently clobbered).
- **Status feedback** — the host status bar shows "scanning repo…" / "pulling
  templates…" while work runs, then clears.
- **Color-coded results** — the `create_plan` tool renders a theme-aware
  summary (bold filenames, green when complete, amber when placeholders remain).
- **Notify levels** — scaffold/verify results with leftover placeholders are
  routed to `warning`, sync failures to `error`.

### Tool

The `create_plan` tool is registered so the agent can generate the files on its
own. Call it with `target: all | plan | agents`. Pass `scaffoldTemplates: true`
to also materialize the project templates first.

## Toolchain detection

Commands in the scaffold are filled from the actual repository, not hard-coded
to npm. Supported toolchains include `npm`, `cargo`, `go`, `python` (with
`uv`/`pytest`/`ruff` detection), and `Makefile` targets, plus `.env.example`-aware
setup where present.

## Customizing your templates

1. Run `/mplan init` — this copies the bundled defaults to `.pi/pimplan/`.
2. Edit `.pi/pimplan/AGENTS.md` and `.pi/pimplan/plan.md` to match your
   conventions. See [CONFIG.md](./CONFIG.md) for the placeholder reference.
3. Regenerate any project with `/mplan` — detectors reuse your templates.

Personal templates copied into `~/.pi/mplan/` (e.g. with `/mplan sync`) are
used as a global default for every project that has no project-level template.

## Development

```bash
pnpm install          # install deps
pnpm check            # typecheck + lint
pnpm test             # run vitest
pnpm build            # bundle with tsup
pnpm release:check    # pack dry-run to inspect the tarball
```

The repo uses a `Makefile` mirroring these commands (`make build`, `make test`,
`make check`, …). `pnpm prepack` runs `check`, `test`, and `build` before
packing.

## Configuration and templates

See [CONFIG.md](./CONFIG.md) for the full placeholder reference, toolchain
detection table, template-resolution levels, and layout guide.

## License

MIT