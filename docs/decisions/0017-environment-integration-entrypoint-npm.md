---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# A single npm-run dev entrypoint integrating the local environment; npm as package manager

## Context and Problem Statement

The local environment now has several moving parts: the app via `next dev` (**0015**), the
Supabase stack via the CLI (**0016**), generated types from the schema (**0012**), and
environment variables that must be synced (`vercel env pull`, **0015**) and resolved
consistently. Started ad hoc, in the wrong order, these parts disagree — the app boots
before the database is up, or against stale types, or with the wrong env. The project needs
a single, deterministic entrypoint that brings up a working, production-faithful environment
in one command.

This record also settles the **package manager**, which is the tool that installs
dependencies and runs every script (including that entrypoint). The candidates (npm, pnpm,
yarn, bun) are all real and worth weighing explicitly, because the choice fixes the lockfile
format and the `run` semantics the whole project depends on.

## Decision Drivers

* **One command to a working environment** — contributors and the agent should reach a
  running, prod-faithful setup without remembering a sequence.
* **Deterministic startup order** — database up, then types generated, then env resolved,
  then the app — so nothing starts against stale or missing dependencies.
* **One package manager, one lockfile** — a single, reproducible dependency resolution
  (`npm ci` in CI) and script runner.
* **Lowest-friction default** — the package manager bundled with Node needs no extra
  install step for contributors or CI.

## Considered Options

* npm as the package manager, with a single orchestrated `npm run dev` entrypoint
* An alternative package manager (pnpm / yarn / bun) with the same orchestration
* No orchestrator — documented manual multi-step startup

## Decision Outcome

Chosen option: "npm + a single orchestrated entrypoint", because npm ships with Node
(**0004**) so it needs no bootstrap step in dev or CI, and a single `npm run dev` removes the
ordering pitfalls of starting the parts by hand. The dev orchestrator (e.g.
`scripts/dev.mjs`) runs the sequence: bring up the local Supabase stack (**0016**) → generate
types (**0012**) → sync/resolve environment variables (`vercel env pull` when linked,
**0015**) → start `next dev` (**0015**). npm is the package manager of
record: `package-lock.json` is the lockfile, `npm ci` installs in CI, and pnpm/yarn/bun are
not used.

### Consequences

* Good, because a single command yields a deterministic, production-faithful local
  environment, lowering onboarding and agent friction.
* Good, because npm needs no separate installation, keeping dev and CI setup minimal.
* Good, because one lockfile and one runner make dependency resolution reproducible.
* Bad, because npm is slower and less disk-efficient than pnpm and lacks some workspace
  ergonomics, a cost accepted for ubiquity and zero-setup.
* Bad, because the orchestrator script is bespoke code that must be maintained as the
  environment evolves.

### Confirmation

`npm run dev` runs the orchestrator (Supabase up → `gen:types` → env sync/resolve →
`next dev`). `package-lock.json` is committed; CI uses `npm ci`. The absence of
`pnpm-lock.yaml` / `yarn.lock` / `bun.lockb` is verifiable.

## Pros and Cons of the Options

### npm + orchestrated entrypoint (chosen)

* Good, because npm is zero-setup (ships with Node) and the entrypoint guarantees startup
  order.
* Good, because one lockfile/runner is reproducible across dev and CI.
* Bad, because npm is slower/less disk-efficient than pnpm, and the orchestrator is bespoke.

### Alternative package manager (pnpm / yarn / bun) + orchestration

* Good, because pnpm/bun are faster and more disk-efficient, with strong workspace support.
* Neutral, because the orchestration approach would be identical.
* Bad, because each adds a bootstrap/install step in dev and CI, for benefits a single-app
  project barely realizes.

### No orchestrator (manual steps)

* Good, because there is no bespoke script to maintain.
* Bad, because contributors must run several commands in the right order every time, which is
  error-prone and a frequent source of "it didn't work" — the exact friction this decision
  removes.

## More Information

Builds on **0004** (npm ships with Node), **0012** (type generation step), **0015**
(`next dev` + `vercel env pull`), and **0016** (local Supabase stack). The `npm ci` install
and the gate commands are
consumed by CI (**0008**); the environment variables the orchestrator resolves are governed
by a later secrets/env decision.
