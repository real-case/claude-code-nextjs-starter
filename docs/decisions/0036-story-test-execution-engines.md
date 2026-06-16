---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Story-test execution: Vitest addon as the test/coverage engine, test-runner for built-Storybook smoke

## Context and Problem Statement

**0034** adopted Storybook with the Vitest addon (`@storybook/addon-vitest`), running stories
as component tests in Vitest browser mode via the Playwright provider. Storybook offers a
*second* way to run stories as tests — `@storybook/test-runner`, a Jest + Playwright runner
that drives every story against a *running or statically built* Storybook. The two overlap:
both render stories, execute `play` functions, and can produce coverage and accessibility
results. Choosing the most comprehensive component testing therefore requires deciding the
*relationship* between the two engines, not silently running both and executing every story
twice.

A related ambiguity must also be settled: `composeStories` (portable stories) is **not** the
addon. The addon runs stories directly; `composeStories` imports a story as a fixture *inside*
a hand-written test (the RTL layer of **0006**). This record fixes which engine owns what.

## Decision Drivers

* **Breadth of execution surface** — the most regressions are caught when stories are
  exercised both in dev/browser-mode *and* against the production Storybook bundle.
* **No redundant double-execution** — two engines must have non-overlapping roles, or the same
  assertions run twice for no gain.
* **Toolchain reuse** — both engines should reuse the Playwright + Vitest machinery from
  **0006** / **0034**, not add a third stack.
* **Build integrity** — a story can pass in dev yet break in the built Storybook (static
  assets, build-only config); something must exercise the built bundle.
* **CI fit** — every engine must run non-interactively in the quality gate (**0008**).

## Considered Options

* Vitest addon as the primary test/coverage engine **and** `@storybook/test-runner` as a smoke
  pass over the built Storybook
* Vitest addon only (leave **0034** as-is, no runner)
* `@storybook/test-runner` only (replace the addon)

## Decision Outcome

Chosen option: "Vitest addon as primary engine + test-runner for built-Storybook smoke",
because it gives the widest execution surface while keeping the two engines in strictly
separate roles. The **Vitest addon is authoritative**: it runs every story as a component test
in browser mode, hosts the interaction assertions (**0037**) and the accessibility checks
(**0038**), and produces the coverage that feeds the gate (**0031**). The
**`@storybook/test-runner` runs in CI against the statically built Storybook** (`storybook
build`, served, then `test-runner`) as a **smoke layer**: every story must render without
throwing and `play` functions execute headless — catching build-only and static-only breakage
the dev-mode addon never sees. The roles do not overlap: the addon owns assertions and coverage
in browser mode; the runner owns build-integrity smoke over the production bundle.
`composeStories` is reserved for the case where a hand-written RTL test (**0006**) needs a story
as a fixture for bespoke assertions beyond what the story itself encodes — it is not the default
path.

### Consequences

* Good, because regressions are caught on two surfaces — logic/interaction/a11y in browser-mode
  (addon) and build/static integrity over the production bundle (runner).
* Good, because both engines reuse Playwright and the stories already written; the runner adds
  build smoke, not duplicate assertions.
* Good, because coverage stays single-sourced in the addon project and merges into **0031**,
  so the gate keeps one defined meaning.
* Bad, because two test mechanisms are maintained and CI pays for building Storybook, serving
  it, and running the runner in addition to the addon.
* Bad, because the non-overlap discipline is a convention: without care, teams re-assert in
  the runner what the addon already checks, reintroducing double-execution.

### Confirmation

`@storybook/addon-vitest` is wired into the Vitest project (**0034**) and its coverage merges
into the **0031** gate. A CI job (**0008**) runs `storybook build`, serves the output, and runs
`@storybook/test-runner` in smoke mode (render-without-throw + `play`). No assertion suite is
duplicated across the two — the runner config carries only smoke/`play`, not bespoke matchers.

## Pros and Cons of the Options

### Vitest addon + test-runner smoke (chosen)

* Good, because it is the broadest surface: dev browser-mode tests plus production-build smoke.
* Good, because roles are separable, so the runner is additive (build integrity), not redundant.
* Neutral, because it reuses Playwright/Vitest already in the stack.
* Bad, because it is two mechanisms and extra CI time (build + serve + runner).

### Vitest addon only

* Good, because it is the simplest setup and exactly what **0034** already decided.
* Neutral, because it covers component/interaction/a11y/coverage in browser mode.
* Bad, because nothing exercises the *built* Storybook, so build-only and static-only breakage
  ships unnoticed — a gap against "most comprehensive".

### test-runner only

* Good, because a single runner does smoke + `play` + (via hooks) a11y and coverage.
* Bad, because it runs against a served Storybook rather than as Vitest tests, so it does not
  integrate with the **0006**/**0034** Vitest project or feed the **0031** coverage gate as
  cleanly, and it discards the addon already chosen in **0034**.

## More Information

This record is the hub for the story-testing modalities: **0037** (interaction), **0038**
(accessibility), and **0039** (snapshots) all run *on the engines decided here*. Builds on
**0034** (the addon engine), **0006** (Playwright/Vitest reuse and the `composeStories`
boundary), **0035** (the CSF 3 stories both engines execute), **0031** (coverage gate fed by
the addon), **0008** (CI runs both), and **0007** (the built Storybook artifact the runner
smoke-tests). Targets the Storybook 9 line. Revisit if the test-runner's roles are fully
absorbed by the addon in a later Storybook release, at which point the runner could be dropped.
