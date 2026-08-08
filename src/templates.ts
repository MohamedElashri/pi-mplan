/**
 * Bundled default templates for plan.md and AGENTS.md.
 *
 * These are used when a project does not provide its own templates under
 * `.pi/pimplan/`. Copy them per-project with `/pimplan init` and customize
 * them there; the extension always prefers the project-local copy.
 */
export const DEFAULT_AGENTS_TEMPLATE = `# AGENTS.md

Repository-specific instructions for coding agents. This file overrides global defaults when they conflict.

## Project Summary

TODO: Describe in 2-5 sentences:

- What the project does.
- Who uses it.
- Main language/runtime.
- Important domain constraints.

## Repository Layout

\`\`\`text
TODO
\`\`\`

## Development Commands

Use these commands instead of guessing. If unavailable, write \`Not available\`.

\`\`\`bash
# setup
TODO

# build
TODO

# test
TODO

# lint
TODO

# format
TODO

# run locally
TODO
\`\`\`

## Working Rules

Before editing:

1. Read this file, \`README.md\`, \`CONTRIBUTING.md\` if present, and relevant docs.
2. Inspect relevant source and tests.
3. Identify the narrowest useful validation command.
4. Follow existing patterns before adding new ones.

For non-trivial work, create or update \`plan.md\`. It is a private implementation ledger and should normally be ignored by git:

\`\`\`gitignore
plan*
\`\`\`

## Implementation Rules

Prefer small diffs, clear names, explicit errors, deterministic behavior, minimal dependencies, and tests for changed behavior.

Avoid broad rewrites, new frameworks without a clear need, silent fallbacks, unrelated formatting, placeholder code, and TODO comments not captured in \`plan.md\`.

Preserve public behavior unless the task explicitly changes it.

## Testing

Run the narrowest meaningful check first, then broader checks when practical:

1. Targeted test.
2. Related integration test.
3. Lint or format check.
4. Full test suite.

If tests cannot run, report which command, why it could not run, and residual risk. Do not claim testing that did not happen.

## Documentation

Update user-facing docs when behavior, commands, configuration, public APIs, or important error behavior changes. Keep private planning notes in \`plan.md\`, not \`README.md\`.

## Special Constraints

TODO: Add project-specific security, performance, compatibility, data, deployment, or domain constraints.
`;

export const DEFAULT_PLAN_TEMPLATE = `# Implementation Plan

Private implementation ledger for the current task. Keep concise, current, and specific.

## Goal

TODO: State the final outcome in concrete terms.

## Scope

In:

- TODO

Out:

- TODO

## Constraints

- Preserve existing public behavior unless intentionally changed.
- Keep changes small and reviewable.
- Avoid new dependencies unless justified.
- TODO: Add project-specific constraints.

## Current State

- Relevant files: TODO
- Existing behavior: TODO
- Known commands: TODO
- Risks: TODO

## Commands

\`\`\`bash
# setup
TODO

# build
TODO

# test
TODO

# lint/format
TODO

# run
TODO
\`\`\`

## Acceptance Criteria

- TODO
- TODO

## Test Plan

1. TODO: Narrow targeted check.
2. TODO: Related integration or workflow check.
3. TODO: Lint/format/full suite if practical.

## Phases

### Phase 0: Orientation

Deliverables:
- Identify structure, commands, relevant files, conventions, and risks.

Acceptance criteria:
- Implementation path is clear before editing.

Status:
- Pending

Completion notes:
- Not started.

Deviation notes:
- None.

### Phase 1: Implementation

Deliverables:
- Make the smallest useful change.
- Preserve unrelated behavior.

Acceptance criteria:
- Requested behavior is implemented.
- Obvious error paths are handled.

Status:
- Pending

Completion notes:
- Not started.

Deviation notes:
- None.

### Phase 2: Validation and Cleanup

Deliverables:
- Run planned checks or document blockers.
- Update relevant docs.
- Review final diff.

Acceptance criteria:
- Results and remaining risks are recorded.
- No unrelated changes remain.

Status:
- Pending

Completion notes:
- Not started.

Deviation notes:
- None.
`;
