---
status: "superseded by ADR-0057"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Component workbench: Storybook on the Vite builder, with stories doubling as tests

## Context and Problem Statement

The component layer — shadcn/ui over Radix (**0026**), themed by the design tokens (**0025**)
and styled with Tailwind (**0024**) — needs a place to be developed and documented *in
isolation*, outside full App Router pages and a running Supabase backend. Today a component's
states (variants, sizes, loading/error, light/dark, RTL/locale) can only be exercised by
booting the whole app or by reading the source; there is no living catalogue of what the
component layer looks like and how it behaves.

Two questions must be settled together: which isolation workbench to adopt, and *how deeply*
it wires into the testing strategy. The stack shapes both — Vitest is the Vite-native runner
(**0006**) with Playwright already present for the browser, so the workbench's build and test
machinery can either reuse that or stand up a parallel toolchain. Scope is the **client**
component layer; React Server Components and server-only data access (**0002**, **0010**) do
not render in an isolated workbench without mocking and are out of scope here.

## Decision Drivers

* **Isolated development and living documentation** — build and review component states
  without routing, auth, or a database, and keep an always-current catalogue of the UI.
* **Toolchain reuse, not a second build graph** — the workbench should ride the existing
  Vite/ESM/TS setup and the Vitest runner (**0006**), not introduce a parallel Webpack build.
* **Stories as tests, not throwaway fixtures** — the setup written to document a component
  should be reusable as a component test that counts toward the coverage gate (**0031**),
  rather than a duplicate of the RTL fixtures.
* **Token and Tailwind fidelity** — stories must render with the real design tokens (**0025**)
  and Tailwind (**0024**) so the workbench matches production, including theming.
* **RSC boundary fit** — the workbench renders client components; it must respect the
  RSC-default model (**0002**) rather than pretend to render server components.

## Considered Options

* Storybook on the Vite builder, with the Storybook Vitest addon so stories run as
  browser-mode component tests
* Storybook on the Vite builder as a docs/dev workbench only — stories are not tests
* A lighter workbench (Ladle / Histoire)
* No isolated workbench — rely on RTL (**0006**), Playwright e2e, and the running app

## Decision Outcome

Chosen option: "Storybook on the Vite builder, with stories doubling as tests via the
Storybook Vitest addon", because it gives the shadcn/token component layer an isolated
workbench and living documentation while reusing — not duplicating — the test toolchain
already decided. Storybook runs on its Vite builder (`@storybook/nextjs-vite`), sharing the
project's Vite/ESM/TS configuration and picking up the same React Compiler setup (**0033**)
rather than maintaining a separate Webpack graph. The `@storybook/addon-vitest` addon runs
each story as a real component test in Vitest browser mode, reusing the Playwright dependency
introduced in **0006**; those story-tests join the Vitest project and their coverage counts
toward the 80% gate (**0031**).

Concretely: Storybook is configured under `.storybook/`, which imports the global
Tailwind/token stylesheet so stories render with the real design tokens (**0025**) and
Tailwind (**0024**), including light/dark. Stories live beside their components
(`src/**/*.stories.tsx`). Interaction (`play`) functions and the addon execute under Vitest
browser mode. This record *extends* **0006**: stories-as-tests become part of the
unit/component layer, and the component documentation effort and the component test effort
become one artifact.

### Consequences

* Good, because the component layer gains isolated development and an always-current
  catalogue of states, reviewable without booting routes, auth, or a database.
* Good, because the Vite builder and the Playwright browser runner are shared with **0006** —
  one build graph and one browser stack, so the marginal configuration and CI cost is low.
* Good, because a story is also a test: the fixtures written for documentation earn coverage
  toward **0031** instead of being throwaway, and there is a single place to define a
  component's states.
* Good, because stories render against the real tokens (**0025**) and Tailwind (**0024**), so
  the workbench is faithful to production theming rather than an approximation.
* Bad, because Storybook (builder plus addons) is a substantial dependency surface kept on the
  Storybook/Vite/Vitest version treadmill.
* Bad, because coupling stories to the test gate makes them load-bearing — a broken story can
  fail CI (**0008**), so stories are no longer optional decoration.
* Bad, because RSC/server-only components and Supabase-backed data (**0002**, **0010**) do not
  render in the workbench without mocks; async server components stay outside Storybook's scope.

### Confirmation

`.storybook/` exists and is configured with the Vite builder (`@storybook/nextjs-vite`) and
`@storybook/addon-vitest` wired into the Vitest project/workspace config. `npm run storybook`
serves the workbench; the Storybook test project runs under `vitest` and its coverage merges
into the **0031** gate, executed in the CI quality gate (**0008**). The `.storybook` preview
imports the global token/Tailwind stylesheet, and stories live at `src/**/*.stories.tsx`. No
parallel Webpack-based Storybook build is present.

## Pros and Cons of the Options

### Storybook (Vite builder) + Vitest addon, stories as tests (chosen)

* Good, because it delivers the workbench and living docs while reusing the Vite builder and
  the Playwright/Vitest runner from **0006** — no second toolchain.
* Good, because stories double as browser-mode component tests that feed the **0031** coverage
  gate, eliminating duplicate fixtures.
* Good, because it renders with the real design tokens (**0025**) and Tailwind (**0024**).
* Neutral, because it is one more dependency surface, though aligned with the existing Vite/TS
  stack.
* Bad, because stories become load-bearing for CI, and the Storybook/addon stack must be kept
  current.

### Storybook (Vite builder), docs/dev workbench only

* Good, because it is a simpler adoption — just the workbench, fully orthogonal to the test
  pyramid (**0006**, **0031** unchanged).
* Neutral, because it still renders with real tokens and Tailwind.
* Bad, because stories and component tests stay as two separate efforts; the documentation
  fixtures earn no coverage and can silently drift from how components are actually tested.

### A lighter workbench (Ladle / Histoire)

* Good, because both are lean, fast, Vite-native story viewers with less configuration.
* Neutral, because they cover the isolated-development need for simple cases.
* Bad, because they have a far smaller addon ecosystem and no first-party stories-as-tests
  integration with Vitest, so the test-layer reuse — the main reason for the chosen option —
  would have to be hand-built, and Histoire's momentum is uncertain.

### No isolated workbench

* Good, because it adds zero tooling and keeps the dependency surface minimal.
* Bad, because component states can only be exercised through full pages or RTL assertions —
  no visual catalogue, no isolated development of variants, and no living documentation of the
  component layer (**0026**), which is exactly the gap this record addresses.

## More Information

Builds on **0024** (Tailwind), **0025** (design tokens), and **0026** (the shadcn/ui component
layer the stories document and exercise); respects the RSC boundary in **0002** (stories cover
client components). It **extends 0006** by adding stories-as-tests to the unit/component layer
and reusing its Playwright + Vitest machinery, and it feeds the coverage gate in **0031**; the
CI workflow that runs the test project is **0008**, and the Vite builder picks up the React
Compiler configuration from **0033**. Per **CON-001** / **CON-002**, React and Next.js (App
Router) are mandated; this record decides only the component workbench, not the framework.
Targets the Storybook 9 line, where the Vitest addon (`@storybook/addon-vitest`) and the
Next.js Vite builder (`@storybook/nextjs-vite`) are first-party. Revisit if the project moves
off Vitest browser mode, or if RSC/server-component preview support matures enough to bring
server components into the workbench.
