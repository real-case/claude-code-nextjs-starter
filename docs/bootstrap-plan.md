# Bootstrap-stage deviations

This template is built up in phases. A few **accepted-ADR commitments are temporarily
deviated from while the repo has no real feature code yet** — to keep CI turnaround fast
and the toolchain lean during bootstrap. Each deviation here is **temporary**, tracked
against its re-enable condition, and is **not** an ADR change: the recorded decision
remains the target end-state. `ci.yml` links here from the comments that disable the
affected jobs.

> A deviation belongs here only if it (a) departs from an **accepted** ADR, (b) is
> temporary, and (c) names a concrete re-enable trigger. Anything permanent needs a
> superseding ADR instead.

## Active deviations

### 1. Playwright e2e + migration replay removed from CI

- **ADR commitment:** Playwright e2e in the CI gate, exercising the auth/RLS critical
  path end-to-end (ADR 0007 testing, ADR 0010 CI gate, ADR 0008 the gate as a merge
  requirement). The risk-weighted critical path gets e2e first (ADR 0007).
- **Deviation:** the e2e job (Supabase stack startup → migration replay → `gen:types`
  drift check → auth/RLS e2e) is **removed from `ci.yml`** (since 2026-06-11).
- **Why:** Supabase image pulls (~3–4 min/run) dominate CI turnaround during bootstrap,
  while there are no real feature components and no migrations yet.
- **Compensating control:** the specs still run **locally** on every change —
  `npm run test:e2e` (needs a local stack: `npx supabase start`). Until the job returns,
  the `supabase-rls-reviewer` agent and the `create-migration` skill's RLS self-check are
  the load-bearing guards for row-isolation correctness.
- **Re-enable:** before the **first `dev` → `main` production promotion** (ADR 0011).
  Recover the exact working job from git history (the `feat/phase-7-supabase` commits
  before its removal) — it is correct and CI-verified up to the e2e step.

### 2. Storybook test-runner smoke is local-only

- **ADR commitment:** a `@storybook/test-runner` smoke pass over the **statically built**
  Storybook in CI — render + play, no axe, no coverage (ADR 0036/0037).
- **Deviation:** the smoke job is **deferred from `ci.yml`** (same lean-bootstrap
  rationale as the e2e job — it adds a Storybook build + serve + a second browser run).
- **Compensating control:** the Vitest addon already runs the \*\*browser-mode story tests
  - a11y + merged coverage\*\* in the quality gate (ADR 0038/0039/0041) — the load-bearing
    engine. The smoke job runs locally on demand: `npm run build-storybook`, serve
    `storybook-static` (or `npm run storybook`), then `npm run test:storybook`.
- **Re-enable:** alongside the e2e job, before the first production promotion.

## Operational note — Node 24

The toolchain requires **Node 24** (`engines.node >=24 <25`, `.nvmrc` `24`, ADR 0004).
Several gates load `.ts` registries directly and rely on Node 24's native type-stripping
(e.g. `check:design-intent`), so running them under an older Node fails with
`ERR_UNKNOWN_FILE_EXTENSION`. CI pins Node 24 via `.nvmrc`; locally, ensure `node -v` is
`v24.x` (`nvm use`) before running the gate suite.
