# pi-mplan

Plan + AGENTS.md generator extension for [Pi](https://github.com/earendil-works/pi-coding-agent).

`pi-mplan` creates `plan.md` and `AGENTS.md` for a project from your templates.
It first writes a deterministic scaffold from real repository facts (scripts,
layout, README), then hands the agent a refinement instruction so it completes
the files with actual project knowledge. The scaffold is always written, so you
get a usable result even without an LLM turn.

## Features

- `/mplan` command and `create_plan` tool
- Templates resolved from project, user, then bundled defaults
- Multi-toolchain detection (npm, Cargo, Go, Python, Make)
- LLM refinement of leftover placeholders
- Verify, sync, and safe atomic writes

## Install

```bash
pi install npm:pi-mplan
```

From a local checkout:

```bash
pnpm build
pnpm pack
pi install ./pi-mplan-0.1.0.tgz
```

## Usage

| Command | Action |
| --- | --- |
| `/mplan` | Generate + refine both files |
| `/mplan plan` | Generate/refine `plan.md` only |
| `/mplan agents` | Generate/refine `AGENTS.md` only |
| `/mplan init` | Copy templates into `.pi/pimplan/` |
| `/mplan scaffold` | Deterministic scaffold only |
| `/mplan verify` | Report leftover placeholders |
| `/mplan sync` | Pull personal templates from the `agentic` repo |
| `/mplan help` | Show help |

The `create_plan` tool lets the agent generate files too. Call it with
`target: all | plan | agents` (optionally `scaffoldTemplates: true`).

## Development

```bash
pnpm install          # install deps
pnpm check            # typecheck + lint
pnpm test             # run vitest
pnpm build            # bundle with tsup
```

The `Makefile` mirrors these (`make check`, `make test`, `make build`, ...).

See [CONFIG.md](./CONFIG.md) for template resolution details, the placeholder
reference, toolchain detection, and the extend-your-own layout guide.

## License

MIT