# Claude Code Next Starter

> A **Next.js 16 + Supabase** starter wired end-to-end for **Claude Code** — an ADR
> decision corpus, deterministic governance gates, a design-system tooling layer, and a
> full `.claude/` agent / skill / hook / MCP setup, so an AI agent implements under
> machine-checked rules from the first commit.

A Next.js 16 (App Router, React 19) + Supabase application bootstrapped **decisions-first**,
with an AI agent as the primary implementer (ADR 0046) working under deterministic
governance. Every architectural decision is an ADR under
[`docs/decisions/`](docs/decisions/) — 64 records, 63 accepted plus ADR 0033 `proposed`
(the template's neutral token baseline, pending the human acceptance gate), and the
client-mandate registry
[`constraints.md`](docs/decisions/constraints.md); see
[`docs/decisions/README.md`](docs/decisions/README.md) for the index.

> **Status — template.** This repo is the **starter template** extracted from the
> reference build: the ADRs, linters, design-system governance, and AI toolchain are
> intact, but the demo application (the booking/notes/auth screens, their components and
> Storybook stories) has been removed and the design tokens reset to a neutral shadcn
> baseline. `src/components/**` ships **zero components** — the governance gates are
> vacuously green and re-engage on the first component you add. Everything below describes
> the machinery you inherit; the design-system tooling's rationale is in
> [`docs/design-system-ai-tooling-plan.md`](docs/design-system-ai-tooling-plan.md).

## Use this template

1. **Create your repo** — click **"Use this template" → Create a new repository** on
   GitHub, or `gh repo create <you>/<app> --template UrchinStriped/claude-code-next-starter`.
2. **Install and run the gates** (Node 24 — see [`.nvmrc`](.nvmrc)):
   ```bash
   npm install
   npm run typecheck && npm run lint && npm run check:design-system && npm run build
   ```
3. **Make it yours** — set the name in [`package.json`](package.json) and
   [`supabase/config.toml`](supabase/config.toml), replace this README, and start adding
   ADRs and features. The governance gates engage on your first component; the agent's
   standing brief is [`CLAUDE.md`](CLAUDE.md).

## Principles — deterministic AI-driven development

An AI agent writes most of the code in this repo. The premise of the whole setup is that
an agent's output is only trustworthy when the rules it works under are **machine-checkable,
generated from a single source, and proven to enforce themselves** — prose conventions rot,
gates don't. **[`AI-GUARDRAILS.md`](AI-GUARDRAILS.md) is the detailed, diagrammed
companion to this section** — defense-in-depth layers, the edit→CI→human timeline, the
single-source codegen flow, and the feedback loops. The mechanisms in brief:

1. **Decisions before code (ADR 0001).** No code lands without a covering ADR (or
   `CON-00x` constraint). Records are MADR full-template, sequentially numbered, and
   **immutable once accepted** — changes go through a superseding record, never an edit.
   The `proposed → accepted` transition is human-only. Corpus integrity is itself a
   check: `adr.py lint` validates numbering, cross-references, required sections, and
   index freshness. Even [`CLAUDE.md`](CLAUDE.md) (the agent's standing instructions) is
   derived from the _accepted_ corpus via `adr-sync-claude-md`, not hand-maintained.

2. **One spine, three verification layers** (the
   [the design-system plan §1](docs/design-system-ai-tooling-plan.md)). Every rule lands in
   exactly one layer, chosen by the kind of guarantee it needs:
   - **Deterministic** (CI gates, block merge) — _precision over recall_: a green gate
     means the property holds. Token lints, import boundaries, fitness functions,
     drift checks.
   - **Structural** (skills + graphs, warn) — _recall over precision_: reduces violation
     frequency inside the agent's own loop, never the guarantee. Signature/state-coverage
     helpers (`ds:*` below).
   - **Judgment** (human gates) — the irreducible: intent collisions, baseline approval,
     anything irreversible.

3. **Generated artifacts, never prose (anti-"knowledge laundering", ADR 0058, 0015).**
   Anything the agent must obey is _generated_ from the canonical source and
   **drift-checked in CI**: DB types from the live schema (`gen:types`), the design-token
   union + ESLint allowlist + the agent-rules reference from the CSS `@theme` layer
   (`gen:tokens`). CI regenerates and fails on `git diff` — so the rules the agent reads
   and the rules CI enforces can never silently diverge.

4. **Fitness functions guard stored intent (ADR 0059, 0060, 0062).** Declared intent is
   data, and CI reconciles it against reality: the human-curated composition graph
   (`composedOf`/`usedIn`) against the dependency-cruiser **import graph**
   (`check:graph`); each component's typed `design-intent.ts` against its actual props,
   its archetype's mandatory state set (coverage **by subtraction** — skipping a state
   requires a recorded rationale), and its stories (`check:design-intent`).

5. **Gates that test themselves (P6, `check:gates`).** Every custom rule is verified to
   _reject a planted violator_ — a gate that cannot fail is indistinguishable from no
   gate. This runs in CI like any other check.

6. **Determinism in the checks themselves.** No global CI retries — a flaky test is
   quarantined explicitly (annotated skip + tracked issue, time-boxed), never papered
   over (ADR 0049). Visual snapshots freeze animations/time so a diff means a real
   change (ADR 0043). Required status checks are **deterministic-only**.

7. **AI is advisory; humans gate (ADR 0046, 0047, 0048).** Every AI process job (review,
   triage, changelog, security L2) posts comments citing ADR numbers and is **never a
   required check**. Human-only actions are enumerated and lived: accepting ADRs, repo
   settings, production promotion, secrets, `constraints.md`, merges into `dev`/`main`.
   Every PR — agent-authored or not — requires human approval.

8. **Anti-hallucination proof (ADR 0063).** During API approval the agent is shown
   **Figma pixels it does not control** — never its own render, never Figma's code
   path — and the artifact is sealed (`renderHash` + `figmaFileVersion`) as a drift
   detector. The agent never approves its own visual baseline (Chromatic UI is
   human-only).

9. **Reactive rule growth (ADR 0064).** A [Defect Log](docs/design-system/defect-log.md)
   records every missing/ambiguous rule found in review; an invariant **graduates into a
   deterministic Stage-1 check on its first violation**. The rule set grows from observed
   failures, not speculation.

## Agent / MCP toolchain (ADR 0044, CON-003)

The mandated MCP servers are declared in the committed [`.mcp.json`](.mcp.json):
official/first-party implementations only, npm-run servers pinned to exact versions,
credentials **only** as `${ENV_VAR}` references — never literals. Per-developer additions
or overrides belong in your untracked user-scoped MCP config, layered over this baseline.

| Server      | Implementation                                                                             | Auth                                |
| ----------- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| `context7`  | `@upstash/context7-mcp@3.1.0` (npm, pinned)                                                | none required                       |
| `figma`     | `https://mcp.figma.com/mcp` (first-party)                                                  | OAuth, interactive on first connect |
| `vercel`    | `https://mcp.vercel.com` (first-party)                                                     | OAuth, interactive on first connect |
| `supabase`  | `@supabase/mcp-server-supabase@0.8.2` (npm, pinned, `--read-only`)                         | `SUPABASE_ACCESS_TOKEN`             |
| `chromatic` | `https://<app-id>.chromatic.com/mcp` (first-party, the published Storybook's `/mcp` route) | Chromatic sign-in                   |

The `figma` server is consulted **read-only** for design context; design tokens are
code-canonical and never imported from Figma (ADR 0045).

### Required environment variables

Copy [`.env.example`](.env.example) to `.env` (gitignored) and fill in the values. The
`${...}` references in `.mcp.json` are expanded from the environment that launches the
MCP client, so load the file before starting it (e.g. `set -a; source .env; set +a`, or
direnv). Tokens are scoped least-privilege (ADR 0044); provisioning and rotation are
human-only actions (ADR 0046).

| Variable                  | Used by                    | Notes                                                                                                                                                                      |
| ------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`   | `supabase` MCP server      | Personal access token, least-privilege                                                                                                                                     |
| `SUPABASE_PROJECT_REF`    | `supabase` MCP server      | Set once the cloud project exists (bootstrap Phase 7)                                                                                                                      |
| `CHROMATIC_APP_ID`        | `chromatic` MCP server URL | Set once the Chromatic project exists (bootstrap Phase 11)                                                                                                                 |
| `CHROMATIC_PROJECT_TOKEN` | Chromatic CI builds        | Needed from bootstrap Phase 11, referenced from CI as env/secret                                                                                                           |
| `ANTHROPIC_API_KEY`       | Phase-12 advisory AI jobs  | Inert placeholder — provisions the advisory AI-process jobs (0048–0057); referenced from CI as a secret, never a literal (0044); least-privilege, human-provisioned (0046) |

The `vercel` and `figma` servers authenticate via first-party OAuth flows, so —
improving on the illustrative `${VERCEL_TOKEN}` / `${FIGMA_TOKEN}` examples in ADR
0044 — no stored credential exists for them at all. The `supabase` and `chromatic`
entries stay inert until their environment variables are provisioned; the committed
config is complete and identical for every clone either way.

## Validation & environment (ADR 0017, 0018)

**Zod is the single validation authority.** Data crossing a trust boundary — env, form
input, request bodies, external APIs — is validated by a Zod schema, and the TypeScript
type is always derived from it (`z.infer`); a hand-written interface duplicating a schema
is a review defect. Every boundary schema tags its messages with a human-readable
**origin marker** — `[env]`, `[form:signup]`, `[api:create-order]`, … — so a raw Zod
error in a log or a failing build names its source without a stack trace.

Environment variables go through two modules, never `process.env` directly (enforced by
lint outside these two files):

| Module                                           | Contents                            | Importable from                                                      |
| ------------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------- |
| [`src/lib/env.ts`](src/lib/env.ts)               | Public, client-safe `NEXT_PUBLIC_*` | anywhere                                                             |
| [`src/lib/env.server.ts`](src/lib/env.server.ts) | Secrets (`SUPABASE_SECRET_KEY`, …)  | server code only — client import **fails the build** (`server-only`) |

Both validate eagerly at import, so a missing or malformed variable fails `next build`
with an `[env]`-marked error instead of failing mid-request. Values are stored per
environment in Vercel (ADR 0009); local overrides go in `.env.local` (see
[`.env.example`](.env.example)).

## Internationalization & SEO (ADR 0030, 0031)

**Locales are configured in one place** — [`src/i18n/routing.ts`](src/i18n/routing.ts).
Everything locale-aware (the `[locale]` route segment, the `proxy.ts` negotiation, the
navigation helpers, and the canonical/`hreflang` alternates) derives from that object, so
adding a locale is a two-step change: add the code to `locales` and drop a
`messages/<locale>.json` catalog beside the canonical one.

| Concern                | Where                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| Locale set + policy    | [`src/i18n/routing.ts`](src/i18n/routing.ts)                                 |
| Per-request messages   | [`src/i18n/request.ts`](src/i18n/request.ts)                                 |
| Locale-aware `<Link>`  | [`src/i18n/navigation.ts`](src/i18n/navigation.ts)                           |
| Negotiation + redirect | [`src/proxy.ts`](src/proxy.ts)                                               |
| Message catalogs       | [`messages/`](messages)                                                      |
| Canonical / `hreflang` | [`src/i18n/metadata.ts`](src/i18n/metadata.ts)                               |
| Sitemap / robots       | [`src/app/sitemap.ts`](src/app/sitemap.ts), [`robots.ts`](src/app/robots.ts) |

Current config: a single locale, `en`, which is the **canonical source locale** — all copy
is authored here and the ADR 0055 agent-translation workflow (Phase 12) drafts other
catalogs from it. The prefix policy is **`always`**: every locale is prefixed (`/en/…`,
including the default) and `/` redirects to the negotiated locale, which keeps one
canonical URL per locale so the `hreflang`/canonical alternates need no default-locale
special case. Message keys and locale values are **type-checked** against the `en` catalog
via the next-intl augmentation in [`src/global.d.ts`](src/global.d.ts), so a typo'd key
fails `tsc`.

**Metadata** is declared with the App Router Metadata API, never hand-rolled `<head>`
tags. The root layout sets `metadataBase` (from `NEXT_PUBLIC_SITE_URL`) plus shared
Open Graph/Twitter defaults; `generateMetadata` emits the per-locale title, description,
and canonical/`hreflang` alternates. Adding a route means adding it to the `routes` list in
[`src/app/sitemap.ts`](src/app/sitemap.ts) so it is emitted once per locale.

> Next 16 renamed the `middleware` file convention to `proxy`; `src/proxy.ts` is the
> request interception the ADRs call "middleware". Phase 7 composes the Supabase session
> refresh around it (ADR 0013, 0016) — both run per request.

## Data & auth — Supabase (ADR 0012, 0013, 0014, 0015, 0016)

**Local stack.** `npx supabase start` brings up Postgres + Auth + the API on the
standard ports (needs Docker). `npm run db:reset` rebuilds the database from the SQL
migrations in [`supabase/migrations/`](supabase/migrations); `npm run gen:types`
regenerates [`src/lib/supabase/database.types.ts`](src/lib/supabase/database.types.ts) —
**run it after every migration; CI fails on drift.**

**Row-level security is the boundary.** Every table enables RLS with owner-only policies
written in SQL (`auth.uid() = user_id`), so isolation is enforced by Postgres, not by
application `where` clauses. This template ships **no tables yet** — add your first
migration under [`supabase/migrations/`](supabase/migrations) and run `npm run gen:types`;
the `supabase-rls-reviewer` agent audits the policy before it reaches a PR. Note that a
table also needs explicit `GRANT`s for the
`authenticated` role — grants decide _whether_ a role may touch a table, RLS decides _which
rows_.

**Clients** (typed with the generated `Database`, ADR 0013, 0015):

| Module                                                     | Runs as                   | Used in                              |
| ---------------------------------------------------------- | ------------------------- | ------------------------------------ |
| [`supabase/client.ts`](src/lib/supabase/client.ts)         | signed-in user (RLS)      | Client Components                    |
| [`supabase/server.ts`](src/lib/supabase/server.ts)         | signed-in user (RLS)      | Server Components, Actions, handlers |
| [`supabase/middleware.ts`](src/lib/supabase/middleware.ts) | session refresh           | `proxy.ts` (per request)             |
| [`supabase/admin.ts`](src/lib/supabase/admin.ts)           | service role (bypass RLS) | server-only, behind the secret fence |

**Auth.** Email/password sign-up / sign-in / sign-out (ADR 0016) with React Hook Form +
`zodResolver` (ADR 0020); the **same Zod schema re-validates inside the Server Action**,
because the action endpoint is reachable without the form. The `proxy.ts` middleware
refreshes the session on every request, composed around the next-intl locale handling.

**Keys (ADR 0013, 0018).** The public vars (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) default to the local stack in
[`src/lib/env.ts`](src/lib/env.ts) — the publishable key is public by design and ships to
the browser, so it is committed and allowlisted in `.gitleaks.toml`. The **secret key**
(`SUPABASE_SECRET_KEY`, bypasses RLS) lives only in [`env.server.ts`](src/lib/env.server.ts)
behind the `server-only` fence, never committed; set it in `.env.local` / Vercel. Real
per-environment values are provisioned in Vercel (human-only, ADR 0046).

## State & error architecture (ADR 0019, 0025, 0026, 0028, 0027)

**Three state buckets, no overlap.** Every piece of client state has exactly one home;
putting it in the wrong one is the bug this model exists to prevent.

| Bucket           | Home                       | Holds                                                                                                 | Not for                                 |
| ---------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Server state** | TanStack Query (0025)      | anything fetched from / persisted to the DB — entities, lists, anything stale-able                    | UI toggles, URL-owned state             |
| **URL state**    | nuqs + typed routes (0027) | shareable/bookmarkable state surviving reload + back/forward — search, filters, sort, pagination, tab | secrets, large blobs, ephemeral toggles |
| **Ephemeral UI** | Zustand (0026)             | client-only transient UI — drawers/dialogs open state, wizard step, transient interaction             | anything server-derived or URL-owned    |

Hard rules: **server data is never mirrored into Zustand** (if it can go stale, it is
Query's); **optimistic state lives in the Query cache, not Zustand**; **Server Components
never import a store** — stores are `"use client"` modules
([`src/lib/stores/ui-store.ts`](src/lib/stores/ui-store.ts)), so the bundler enforces the
boundary.

**Server state — TanStack Query (0025).** RSC still fetches initial/server-rendered data
(0002/0013); Query is additive, for interactive post-hydration needs (live search,
background refresh, mutations). [`providers.tsx`](src/app/providers.tsx) mounts a
server-aware client from
[`get-query-client.ts`](src/lib/query/get-query-client.ts) — **fresh per request on the
server, one stable client in the browser**. Build query keys only from the factory in
[`keys.ts`](src/lib/query/keys.ts) (hierarchical, so invalidating `notes.all` cascades to
every nested list/detail) — never inline key arrays at call sites.

**Optimistic UI is the default mutation pattern:** `onMutate` (apply to cache) → `onError`
(roll back) → `onSettled` (invalidate), so mutations feel instant. A **non-optimistic**
mutation needs an objective reason stated in review — irreversible/high-stakes actions,
server-generated results the client cannot predict, or input that server-only validation
could plausibly reject.

**URL state — typed routes + nuqs (0027).** `typedRoutes: true` ([`next.config.ts`](next.config.ts))
type-checks `next/link` / `next/navigation` against real routes, so a malformed `href` fails
the build. Read/write URL state with nuqs `useQueryState(s)` over a parser map under
`src/lib/search-params/`; where a param needs validation beyond a primitive, back the
parser with a Zod schema carrying its `[url:…]` origin marker (0017).

> **Catch-all interaction (0019 × 0027).** Because the localized-404 catch-all
> `[locale]/[...rest]` legitimately matches any path under a locale, a path-shaped route
> typo resolves to the localized 404 at runtime rather than failing the build; typedRoutes
> still rejects structurally-malformed hrefs and is the safety net for raw `next/link`.
> Internal navigation uses the locale-aware helpers from
> [`@/i18n/navigation`](src/i18n/navigation.ts) (`Link`, `redirect`), typed by next-intl.

**Responsiveness — React concurrency first (0028).** For render-scheduling jank (typing that
filters a big list, switching to a heavy tab), reach first for `useTransition` (surface
`isPending`) / `useDeferredValue` — built into React, no dependency. Debounce/throttle only
when the cost is **network** latency; virtualize only when the cost is **DOM size**.
Memoization is the React Compiler's job (0029), not hand-applied.

**Errors & logging (0019).** App Router boundaries present failures; a structured logger
records them. Client copy stays **generic** — the internal detail (message, stack) is
recorded server-side by [`src/lib/logger.ts`](src/lib/logger.ts), which emits one structured
JSON line per event to stdout/stderr (captured as logs on Vercel) and tags errors
**expected** (validation, not-found, auth — logged at `warn`) vs **unexpected** (bugs,
outages — `error`). The policy lives in `classifyError`; throw `ExpectedError` for known
failure modes. External error tracking (e.g. Sentry) is deferred to its own ADR.

| Boundary                      | Scope                                          | Copy                                       |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------ |
| `[locale]/error.tsx`          | segment errors (client boundary)               | localized, generic (+ safe `digest`)       |
| `global-error.tsx`            | root-layout failure (renders its own `<html>`) | generic English (no provider in this path) |
| `[locale]/not-found.tsx`      | localized 404                                  | localized                                  |
| `[locale]/[...rest]/page.tsx` | catch-all → `notFound()`                       | —                                          |

## Component workbench — Storybook (ADR 0035, 0036–0042)

Reusable components in [`src/components/**`](src/components) are developed and tested in
**Storybook 10** on the Next.js Vite builder. Stories are the primary component-test
surface — they double as tests, so a story is documentation _and_ a test at once.

> **[`STORYBOOK-GUARDRAILS.md`](STORYBOOK-GUARDRAILS.md) is the detailed, diagrammed
> companion** — how the architecture mechanically enforces token-only styling, no
> structural duplication, complete testing, and full UI-state coverage (the component
> quartet, the state registry, coverage by subtraction, the states↔stories contract).

> **Storybook 10, not 9 (ADR 0035).** SB9's `nextjs-vite` builder caps at Vite 7 while this
> repo runs **Vite 8 / Vitest 4** (ADR 0007), so the workbench targets the **Storybook 10
> line** — the line that supports Vite 8 — with the same Vite-builder, stories-as-tests
> architecture (ADRs 0035–0042).

| Script                    | What it does                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run storybook`       | dev workbench at `localhost:6006`                                                                 |
| `npm run build-storybook` | static build (`storybook-static/`, gitignored)                                                    |
| `npm run test:coverage`   | runs **both** Vitest projects (`unit` jsdom + `storybook` browser-mode) merged to one ≥80% number |
| `npm run test:unit`       | fast jsdom-only inner loop                                                                        |
| `npm run test:storybook`  | test-runner build-integrity smoke (local; needs a served Storybook)                               |
| `npm run check:stories`   | asserts every `src/components/**` module has colocated stories (ADR 0042)                         |

**Two engines, non-overlapping roles (ADR 0037).** The **Vitest addon** is authoritative:
it runs every story as a browser-mode test (`@vitest/browser-playwright`, chromium), hosts
the `play` interactions (ADR 0038) and the axe accessibility gate (ADR 0039), and its
coverage merges into the single ≥80% gate (ADR 0041/0008). The **`@storybook/test-runner`**
is a build-integrity _smoke_ over the statically built Storybook — render + `play` only,
**no axe, no coverage** — so nothing is double-asserted. The smoke runs locally during
bootstrap; its CI job is deferred (lean), like the Phase-7 e2e.

**Authoring rules.**

- **CSF 3 only** — `eslint-plugin-storybook` `flat/csf-strict` + `meta-satisfies-type`,
  and a `no-restricted-syntax` ban on `Template.bind` make CSF 2 / `storiesOf` fail lint
  (ADR 0036). MDX is for autodocs only, never to define stories.
- **Meaningful states** — every component ships stories for its real states (default,
  variants/sizes, interactive, data-edge, theme/locale where they differ). The
  `check:stories` gate proves a stories file _exists_; the PR template carries the
  state-completeness checklist that is a review judgment (ADR 0042).
- **`play` for interactive components** — drive the UI with `userEvent` and assert via
  `expect`/`within` + `fn()` spies (ADR 0038). Purely presentational components are
  exempt.
- **a11y is a gate, not advice** — axe fails the run on any WCAG 2.2 AA violation. The
  _only_ opt-out is an explicit per-story `a11y` parameter with a stated reason (e.g. a
  destructive variant disabling just `color-contrast` for a known token-contrast issue,
  tracked at the token layer). Never a silent global disable (ADR 0039).
- **Snapshots** — one small, focused serialized-DOM snapshot on a stable structural
  component; baseline updates are reviewed diffs (`vitest -u` in a PR). No `addon-storyshots`;
  _pixel/visual_ regression is a separate concern handled by Chromatic (ADR 0043), below.

## Visual regression — Chromatic (ADR 0043, 0053)

The story modalities above — interaction (0038), a11y (0039), DOM snapshot (0040), line
coverage (0041) — all pass while a component renders with the **wrong** spacing, color,
font, or layout, which is exactly the regression a design-token change (ADR 0033) can
introduce. [Chromatic](https://www.chromatic.com) closes that gap: it publishes the built
Storybook and snapshots every story across browsers/viewports, with diffs reviewed and
approved by a human in the Chromatic UI (ADR 0043/0047). It reuses the existing CSF 3
stories and the ADR-0042 state matrix as baselines — there is **no** separate visual
fixture set.

- **Workflow:** [`.github/workflows/chromatic.yml`](.github/workflows/chromatic.yml) — a
  publish-and-snapshot pass separate from the quality gate (ADR 0037), running on PRs and
  on pushes to `dev`/`main` (the base-branch builds that accept baselines).
- **TurboSnap** (`onlyChanged`) limits snapshots to the stories affected by the changed
  files, bounding snapshot cost and CI time (ADR 0043); it diffs against the git baseline,
  so the job checks out with `fetch-depth: 0`.
- **Token by env-reference** (ADR 0044): `CHROMATIC_PROJECT_TOKEN` is a CI secret, never
  committed. The Chromatic GitHub-App status check is the gating signal — the workflow
  itself exits zero on visual changes (`exitZeroOnChanges`) because approval lives in the
  Chromatic UI, not in a red CI job.
- **Off-repo baselines:** baselines and diff history live in Chromatic, so `git ls-files
'*.png'` is empty by policy (ADR 0043).
- **Determinism discipline** (ADR 0043): a diff is only trustworthy if a story renders
  identically each run. [`.storybook/preview.tsx`](.storybook/preview.tsx) freezes
  animations/transitions (and the text caret) in the Chromatic environment only — via
  `isChromatic()`, so the workbench and the browser-mode test run are untouched; time,
  randomness, and dynamic data are frozen/mocked **per story**.
- **Local run:** `CHROMATIC_PROJECT_TOKEN=… npm run chromatic` (TurboSnap on).

**Bootstrap posture.** The Chromatic project and its token are a human provision (Phase
11, ADR 0046) that has not happened yet, so the workflow is **inert**: a tiny `precheck`
job reports whether the token is set, and the snapshot job is _skipped_ (not failed) until
it is — zero CI time during bootstrap, automatic activation once provisioned. The
`chromatic` MCP server in [`.mcp.json`](.mcp.json) stays inert the same way until
`CHROMATIC_APP_ID` is set.

**AI diff pre-classification is deferred (ADR 0053).** Auto-sorting diffs into noise /
expected / suspected-regression before human approval is _not_ built: the friction is
predicted, not yet measured, and a custom classifier over a SaaS's diff artifacts is the
brittle pipeline ADR 0045 avoids. Compliance is the **absence** of that machinery (checked
by the 0054 drift audit); revisit only on 0053's recorded triggers — sustained approval
load, a native Chromatic triage feature, or noise persisting despite the determinism
discipline above.

## Design handoff — Figma (ADR 0045)

**Design tokens are code-canonical.** The CSS-custom-property token layer (ADR 0033),
mapped into the Tailwind theme (ADR 0032), is the single source of truth for colors,
spacing, and the type scale. Figma **mirrors** that scale; it does not author the
authoritative values, so the two never drift.

- The **`figma` MCP server is read-only** (ADR 0044/0045): agents and developers pull
  design _context_ — component anatomy, states, spacing, redlines via Dev Mode — into
  implementation, never the reverse. There is **no Figma → token export pipeline**; that
  brittle coupling is deliberately rejected (ADR 0045).
- A design-originated token change is a deliberate, reviewed round-trip **through the
  ADR-0033 layer** — never a silent fork in Figma or a generated sync.
- **Component parity:** Figma component names mirror [`src/components/**`](src/components)
  so a design maps traceably to the shadcn component (ADR 0034) that implements it.

## Design-system governance (ADR 0058–0064)

The Phase-12 governance layer turns the design system from convention into machinery —
the concrete implementation of principles 2–5 and 8–9 above. The human-authored and
generated sources of truth live under [`src/design-system/`](src/design-system):

| Artifact                                                                                                                                                                                                             | Kind           | Role                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`tokens.generated.ts`](src/design-system/tokens.generated.ts) + allowlist + [`tokens.agent-rules.md`](src/design-system/tokens.agent-rules.md)                                                                      | **generated**  | token union, lint allowlist, and the agent-facing rule reference — all from `@theme` (0058)                             |
| [`composition-graph.json`](src/design-system/composition-graph.json)                                                                                                                                                 | human-curated  | top-down `composedOf`/`usedIn` graph + exact-set `compositionSignature` v1 (0059)                                       |
| [`usage-roles.ts`](src/design-system/usage-roles.ts), [`archetypes.ts`](src/design-system/archetypes.ts), [`states.ts`](src/design-system/states.ts), [`state-precedence.ts`](src/design-system/state-precedence.ts) | human-ratified | controlled vocabularies and the archetype→states registry (0061)                                                        |
| `src/components/ui/*.design-intent.ts`                                                                                                                                                                               | per-component  | typed intent spec: API derived from the `usedIn` union, slot-vs-variant rationale, state coverage by subtraction (0062) |

**Deterministic gates** (all in CI; bundled as `npm run check:design-system`):

| Command                       | Enforces                                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check:tokens`        | only `var(--token)` from the generated allowlist in components — no raw hex/oklch, inline-style raw values, raw SVG `fill`/`stroke`, Tailwind numbered palette (0058; also part of `lint`) |
| `npm run check:boundaries`    | dependency-cruiser: primitives never import composites, public-API-only imports (`index.ts`), no cycles/orphans (0060)                                                                     |
| `npm run check:graph`         | composition graph ↔ import graph reconciliation — a mismatch fails CI and forces one of them to change (0059/0060)                                                                         |
| `npm run check:design-intent` | the 0062 fitness functions: api↔props, state coverage, states↔stories, meta↔graph                                                                                                          |
| `npm run check:seals`         | Figma drift-seal shape/presence (0063) — inert until a Figma project exists                                                                                                                |
| `npm run check:i18n`          | message-catalog key parity + ICU syntax (0055)                                                                                                                                             |
| `npm run check:gates`         | the gate self-test: every custom rule above rejects its planted violator (P6)                                                                                                              |

**Structural helpers** (advisory, run inside the agent loop — also surfaced as the
`component-signature`, `state-coverage`, and `check-tokens` skills):

| Command                   | When                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `npm run ds:signature`    | **before creating a component** — composition-signature duplicate check against the graph (P2)                             |
| `npm run ds:states`       | when authoring intent/stories — the archetype's mandatory state set, coverage by subtraction (P8)                          |
| `npm run ds:escalations`  | per PR/wave — surfaces usageRole collisions, state-set deviations, and the rubber-stamp metric for the human gates (P3/P8) |
| `npm run ds:tokens-table` | end of a batch wave — the token-consistency table (Stage 6)                                                                |

**Judgment gates** stay human: usage-role collisions, state-set deviations, Chromatic
baselines, Figma-drift resolution. Procedures (vocabulary changes are governed
migrations with an owner; a component fitting no archetype escalates) live in
[`docs/design-system/governance.md`](docs/design-system/governance.md).

## Local development — `npm run dev` (ADR 0021, 0023, 0022, 0024)

`npm run dev` runs the orchestrator in [`scripts/dev.mjs`](scripts/dev.mjs), which brings
the whole local stack up in a **deterministic order** so nothing ever starts against a
missing or stale dependency:

1. **Supabase** — start the local stack if it isn't already up (idempotent — re-running
   `npm run dev` skips a stack that's already running; needs Docker, ADR 0022).
2. **Types** — `gen:types` so [`database.types.ts`](src/lib/supabase/database.types.ts)
   matches the live schema (ADR 0015).
3. **Env** — resolve `.env.local` (see below, ADR 0023).
4. **`next dev`** — hand off to the framework dev server (ADR 0023); Ctrl-C stops both.

Only the official platform CLIs are used — there is **no** bespoke docker-compose (ADR
0021). One foot-gun the orchestrator surfaces clearly: if another local Supabase project
holds the standard ports (54321–54327), `supabase start` fails — stop the other stack with
`supabase stop --project-id <other>` and re-run.

**Environment resolution (ADR 0023, 0018).** Step 3 has two paths:

- **Linked to Vercel** — after the one-time human setup `vercel login` + `vercel link`
  (human-only, ADR 0046), the orchestrator runs `vercel env pull` to sync the project's
  _development_ environment into `.env.local`, so local runs resolve env the way
  production does.
- **Not linked (manual fallback)** — the app still runs on the local defaults baked into
  [`src/lib/env.ts`](src/lib/env.ts) (local Supabase + `http://localhost:3000`); to point
  elsewhere, hand-author `.env.local` from [`.env.example`](.env.example).

## CI gate & deploys (ADR 0009, 0010, 0008, 0056)

Every push to `dev`/`main` and every PR runs
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) on Node 24 — the same commands as
the local gate, in the same order:

```
typecheck → lint → format:check → check:stories
  → check:boundaries → check:graph → check:design-intent → check:seals
  → check:i18n → check:gates → token drift (gen:tokens + git diff --exit-code)
  → build → test:coverage
```

The middle rows are the design-system deterministic gates (ADR 0058–0064, see
[Design-system governance](#design-system-governance-adr-00580064)); the token-drift step
mirrors the `gen:types` drift check — generated artifacts must match their source.
`test:coverage` runs both Vitest projects, so CI installs a Playwright Chromium for the
browser-mode story tests (ADR 0035→0035/0041). Alongside the quality job is a **blocking
secret scan** (gitleaks, allowlist committed in [`.gitleaks.toml`](.gitleaks.toml) — every
entry needs a justification and human review, ADR 0056). Two slower suites run **locally**
during bootstrap rather than in CI (deliberate, tracked lean deviations): the **e2e smoke**
(needs a Supabase stack, Phase 7) and the **Storybook test-runner smoke** (Phase 10); both
rejoin CI before the first `dev` → `main` promotion. Visual regression runs in its own
workflow ([`chromatic.yml`](.github/workflows/chromatic.yml), ADR 0043) — inert until its
token is provisioned (see [Visual regression](#visual-regression--chromatic-adr-0043-0053)).
Deploys are not CI's job: once you connect a Vercel project, it builds previews per PR
and production from `main` (ADR 0009).

### Hotfix exception (ADR 0008)

Only a `hotfix/*` branch (off `main`, ADR 0011) or a PR carrying the `hotfix` label
bypasses the **coverage threshold** — and nothing else of the gate: typecheck, lint,
format, build, the test run itself, and the secret scan all still apply. CI swaps
`test:coverage` for plain `test` on such PRs. Each use is noted in the PR, and a
follow-up restoring the missing coverage is required.

### Branch protection (human-configured, ADR 0010, 0011, 0047)

Branch protection is a repository setting outside version control; it is configured by a
human (ADR 0046) and documented here. On **both** `main` and `dev`:

- Require a pull request before merging; **≥1 approving review**; approver ≠ author
  (agent-authored PRs are reviewed by a human like any other); **dismiss stale approvals**
  on new pushes.
- Required status checks: **Quality gate**, **Secret scan**, **e2e smoke** (the three
  jobs of `.github/workflows/ci.yml`), and — once its token is provisioned (Phase 11) —
  the **Chromatic** visual-regression check (ADR 0043). Required checks stay
  deterministic-only — advisory AI jobs (Phase 12) are never required (ADR 0047).
- No force pushes, no deletions.

## Advisory AI process jobs (ADR 0048–0057)

The Phase-12 AI process layer is wired and **inert until a 👤 human provisions
`ANTHROPIC_API_KEY`** (a repo secret, env-reference only — ADR 0044/0046). Each workflow
starts with a guard job that checks key presence and _skips_ (never fails) without it, so
the jobs self-activate when the key lands — the same inert-until-token pattern as
Chromatic. Per ADR 0047 they are **never required checks**: every one posts advisory
comments citing the ADR records it grounds in.

| Job                                                                                                                                                                                        | Trigger                                                                   | ADR              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------------- |
| AI PR review (diff + ADR corpus, cites record numbers; story-matrix and semantic-a11y angles folded in)                                                                                    | PRs ([`ai-advisory.yml`](.github/workflows/ai-advisory.yml))              | 0048, 0051, 0052 |
| AI security review — Layer 2, diff-scoped, against recorded invariants (secret fence, RLS, env-references); the blocking gitleaks scan stays Layer 1                                       | PRs (same workflow)                                                       | 0056             |
| Changelog draft (categorized from merge history; human edits in the release PR)                                                                                                            | `dev` → `main` PRs                                                        | 0050             |
| CI-failure triage — classifies real regression / flaky-with-evidence / infrastructure                                                                                                      | failed CI runs ([`ai-ci-triage.yml`](.github/workflows/ai-ci-triage.yml)) | 0049             |
| Dependency updates: Renovate with pinned committed config ([`renovate.json`](renovate.json)), grouped scheduled PRs, security advisories bypass the schedule; humans merge — no auto-merge | bot PRs                                                                   | 0057             |

The job implementations live in [`scripts/ai/`](scripts/ai). Translation drafting (0055)
follows the same pattern — the deterministic half (`check:i18n` key parity + ICU) already
blocks in CI; the drafting half is credential-gated.

## Working on this repo

- Decisions first: no code lands without a covering ADR (or `CON-00x` constraint). See
  the ADR Process section in [`CLAUDE.md`](CLAUDE.md) and
  [Principles](#principles--deterministic-ai-driven-development) above.
- Branch model: feature branches → `dev` (integration) → `main` (production), ADR 0011.
- Component loop: `ds:signature` **before** creating a component (duplicate check),
  `ds:states` while authoring its `design-intent.ts`/stories, `check:design-system`
  before committing, `ds:escalations` before requesting review. The allowed-token list
  is the generated
  [`tokens.agent-rules.md`](src/design-system/tokens.agent-rules.md) — never re-list
  tokens in prose.
