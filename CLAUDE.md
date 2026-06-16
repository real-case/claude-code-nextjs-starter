# CLAUDE.md

> **Bootstrap stage.** No application code exists yet. Architectural decisions are
> recorded as ADRs under `docs/decisions/` **before** any code depends on them. The
> **ADR Process** section below is authoritative now; the **Stack / Commands /
> Conventions / Restrictions** sections are Phase-3 placeholders, filled from the
> **accepted** ADRs via the `adr-sync-claude-md` skill once decisions are ratified —
> they are intentionally empty until then.

## ADR Process

All architectural decisions are recorded as ADRs before any code depends on them.

- **Location:** `docs/decisions/`.
- **File naming:** `NNNN-kebab-case-title.md`, zero-padded sequential number; numbers
  are permanent IDs and never change, even under supersession.
- **Template (pinned):** **MADR full template** — `Context and Problem Statement`,
  `Decision Drivers`, `Considered Options` (≥2), `Decision Outcome` (`Chosen option …
  because …`), `Consequences` (Good/Bad), `Confirmation`, `Pros and Cons of the
  Options` (per option), `More Information`. The canonical source is
  `.claude/skills/adr/assets/adr-template.md`.
- **Lifecycle:** `proposed → accepted`. A record is edited freely while `proposed`;
  once `accepted`, changes are made only by a **new superseding record**, never by
  editing in place. The `proposed → accepted` transition is **human-confirmed** — an
  agent never sets `accepted`.
- **Status values:** `proposed | accepted | rejected | deprecated | superseded`.
- **Superseding:** set paired links `supersedes NNNN` / `superseded by NNNN` and move
  the replaced record to `superseded` — done via `adr-supersede`, not by hand.
- **Constraints:** externally fixed, client-mandated stack choices (no alternatives)
  live as `CON-00x` rows in `docs/decisions/constraints.md`, not as ADRs. ADRs cite
  them by ID; the registry back-links to the ADR that resolves any residual choice.
- **Tooling** (`.claude/skills/adr/scripts/adr.py`):
  - `adr.py next` — next zero-padded number.
  - `adr.py index` — regenerate `docs/decisions/README.md` (run after every create or
    status change).
  - `adr.py lint` — corpus integrity (numbering, references, required sections, index
    freshness). Also exposed as the `adr-audit` skill.
  - `adr.py accept NNNN` — the human acceptance gate (`adr-accept` skill).
  - `adr.py supersede --old --new` — paired link-flip (`adr-supersede` skill).
- **Skills:** `adr` (create), `adr-accept`, `adr-audit`, `adr-coverage` (gap
  analysis), `adr-supersede`, `adr-sync-claude-md`. Guided creation/review via the
  `app.adr-create` / `app.adr-review` commands.

When a change needs a decision no ADR covers, record the ADR first (or, for an
externally fixed client mandate, a `CON-00x` row in `constraints.md`), then implement.

## Stack

_Derived from the 63 accepted ADRs via `adr-sync-claude-md` (last synced 2026-06-12; ADR 0034
superseded by 0057 — the Storybook 10 line; ADR 0025 superseded by 0065 — the layered
Figma-export token architecture; the design-system governance layer 0058–0064 is decided,
with enforcement landing incrementally across bootstrap Phase 12 / Stages 0–6)._

- **Next.js (App Router)** on **React 19** (`^19` pinned) — Server Components by
  default (0002; CON-001/CON-002).
- **TypeScript** — `strict: true` + `noUncheckedIndexedAccess` + `noImplicitOverride`
  (0003).
- **Node.js 24 LTS** (`engines.node >=24 <25`, `.nvmrc` `24`); Node-first route
  runtime (0004).
- **npm** — package manager of record, `package-lock.json` (0017).
- **ESLint (flat config) + Prettier** via `eslint-config-prettier`; composes
  `eslint-config-next` + typescript-eslint (0005).
- **Vitest + React Testing Library** (unit/component), **Playwright** (e2e) (0006).
- **Supabase**, scoped to Postgres + RLS + Auth (0009): `@supabase/ssr` data access
  (0010), Supabase CLI migrations (0011), generated DB types (0012), Supabase Auth
  with email/password baseline (0013).
- **Vercel** hosting — Git-integrated per-PR preview + production deploys (0007); CI
  on **GitHub Actions** (0008). Local dev builds on the official platform CLIs
  (0014): `next dev` + `vercel env pull` (0015), local Supabase via CLI (0016).
- **Zod** as the single validation authority (0018); **React Hook Form** +
  `zodResolver` (0019); Zod-validated env modules with a `server-only` secret fence
  (0020).
- **TanStack Query** — server state (0022); **Zustand** — ephemeral client state
  (0023); **nuqs** + Next.js typed routes — URL state (0032).
- **Tailwind CSS, CSS-first** (0024); design tokens as CSS custom properties in
  `@theme` — this template ships a **neutral shadcn baseline**: a value layer (`:root` +
  `.dark`) bridged to the shadcn names via `@theme inline`. The layered Figma-export
  architecture (primitive + semantic + component `--color-c-*` layers) is documented in
  ADR 0065 (supersedes 0025) for when a real design export is wired; **shadcn/ui** is
  copied into the repo (0026).
- **next-intl** for i18n (0027); App Router Metadata API for SEO (0028).
- **React Compiler** — automatic memoization (0033).
- **Storybook 10** on `@storybook/nextjs-vite`, stories double as tests via
  `@storybook/addon-vitest` (0057, superseding 0034): CSF 3 (0035), Vitest addon +
  test-runner smoke engines (0036), `storybook/test` play functions (0037),
  `addon-a11y`/axe gate at WCAG 2.2 AA (0038), scoped DOM-snapshot policy (0039),
  **Chromatic** visual regression with TurboSnap (0043).
- App Router error boundaries + structured stdout JSON logger `src/lib/logger.ts`
  (0021).
- **MCP toolchain** (CON-003): committed `.mcp.json` with env-reference secrets —
  context7, figma (read-only design context, 0044), vercel, supabase, chromatic
  (0042).
- **Design-system AI-tooling governance** (decided 0058–0064; enforcement lands with
  Phase 12 / Stages 0–6): single-source token codegen + a stylelint/ESLint token-usage gate
  (0058); a top-down composition graph (0059) reconciled against a **dependency-cruiser**
  import graph (0060); human-authored controlled vocabularies/state registries under
  `src/design-system/` (0061); per-component typed `design-intent.ts` specs (0062);
  anti-hallucination Figma-image approval with a drift seal (0063); a Defect Log driving
  reactive fitness-function growth (0064).

## Commands

- `npm run dev` — orchestrated startup: Supabase up → `gen:types` → env sync
  (`vercel env pull` when linked) → `next dev` (0015, 0017).
- `npx supabase start` / `npx supabase stop` — local Supabase stack, requires Docker
  (0016).
- `npm run db:reset` — rebuild the local database from `supabase/` migrations
  (0011, 0016).
- `npm run gen:types` — regenerate `src/lib/supabase/database.types.ts`; run after
  every migration; CI fails on drift (0012).
- `npm run lint` — ESLint; `npm run format:check` — Prettier check mode (0005).
- `npm run test` — Vitest, both projects (unit jsdom + Storybook browser-mode);
  `npm run test:unit` — fast jsdom-only loop; `npm run test:coverage` —
  merged-workspace coverage run, fails below 80% (0008, 0031, 0040).
- `npm run storybook` — component workbench dev server; `npm run build-storybook` —
  static build (0057). `npm run test:storybook` — test-runner build-integrity smoke
  over the built Storybook (0036); `npm run check:stories` — every `src/components/**`
  module has colocated stories (0041).
- `tsc --noEmit` — typecheck, part of the CI gate (0003, 0008).
- CI (`.github/workflows/ci.yml`, Node 24, `npm ci`): typecheck → lint →
  format:check → check:stories → build → test:coverage (browser-mode story tests +
  merged coverage), plus migration replay, type-drift check, and Playwright e2e
  against a local Supabase stack (0008, 0017, 0040, 0041).
- Design-system gates (Stages 0–3, wired in CI): `npm run gen:tokens` — regenerate the
  semantic-token union + lint allowlist + agent-rules reference from the `@theme`/`:root`
  layer, CI drift-checked like `gen:types` (0058); `npm run check:boundaries`
  (`depcruise`) — module-boundary gate (0060); `npm run check:graph` —
  composition↔import reconciliation (0059/0060); `npm run check:design-intent` —
  `design-intent.ts` fitness functions (api↔props, state coverage by subtraction,
  states↔stories contract-expansion, meta↔graph) (0062); `npm run check:seals` — Figma
  drift-seal shape/presence gate, inert until a Figma project exists (0063); `npm run
  check:tokens` — token-usage lint over `src/components/**` (0058); `npm run check:i18n` —
  key-parity + ICU (0054); `npm run check:gates` — gate self-test (every custom rule
  rejects its violator, P6); `npm run check:design-system` runs the bundle.
- Design-system agent-loop helpers (advisory — run before/while building a component):
  `npm run ds:signature` — composition-signature duplicate check before creating a
  component (0059, P2); `npm run ds:states` — the mandatory state set for an archetype,
  coverage by subtraction (0061/0062, P8); `npm run ds:escalations` — the Stage-4
  escalation surfacer (usageRole collisions + state-set deviations + the rubber-stamp
  metric, 0061/0062, P3/P8); `npm run ds:tokens-table` — the end-of-wave token-consistency
  table (0058, Stage 6, P1). Surfaced as the `component-signature`, `state-coverage`, and
  `check-tokens` skills. The allowed-token list is the **generated**
  `src/design-system/tokens.agent-rules.md` — never re-list tokens in prose (0058, P6).
- Phase-12 advisory AI jobs (`scripts/ai/*`, ADRs 0047–0056) — inert until a 👤 provisions
  `ANTHROPIC_API_KEY`: AI PR review (0047), CI-failure triage (0048), changelog draft
  (0049), security Layer 2 (0055), via `.github/workflows/ai-advisory.yml` /
  `ai-ci-triage.yml`, plus the Renovate config `renovate.json` (0056). Each is advisory
  (never a required check) and self-activates when the key lands.

## Conventions

- Server Components by default; `"use client"` only at interactive leaves; mutations
  via Server Actions (route handlers for webhook-style endpoints); app code in
  `src/app/` (0002).
- Types are inferred from Zod schemas (`z.infer`), never written separately; boundary
  schemas carry origin markers (`[env]`, `[form:signup]`, …) (0018); the same schema
  validates on the client and re-validates on the server (0019).
- Data access through request-scoped `@supabase/ssr` clients under
  `src/lib/supabase/`; all user-facing access runs as the user under RLS
  (`auth.uid()`); session refresh in middleware (0010, 0013).
- Migrations are plain SQL (including RLS policies) under `supabase/` (0011).
- Env: `NEXT_PUBLIC_*` in `src/lib/env.ts`; secrets in `src/lib/env.server.ts`
  importing `server-only`; values stored per environment in Vercel (0020).
- Errors: `error.tsx` / `global-error.tsx` / `not-found.tsx` boundaries; structured
  JSON logs to stdout; client-facing messages stay generic (0021).
- State buckets: server-derived → TanStack Query; ephemeral UI → Zustand;
  shareable/bookmarkable (search, filters, sort, pagination, tab) → URL via nuqs
  (0022, 0023, 0032).
- Optimistic UI is the default mutation pattern (`onMutate` → rollback on error →
  invalidate); a non-optimistic mutation needs an objective reason, justified in
  review (0022).
- For render-bound jank reach for `useTransition` / `useDeferredValue` first;
  debounce/throttle for network costs, virtualization for huge DOM (0030).
- Styling: Tailwind utilities against the semantic tokens — the neutral shadcn names
  (`--color-primary`, `--color-muted-foreground`, …) exposed via the `@theme inline`
  bridge; light/dark = `.dark` value-layer overrides; shadcn components live in
  `src/components/ui` (0024, 0065, 0026).
- i18n: routes under `src/app/[locale]/`; catalogs in `messages/<locale>.json`;
  middleware composes next-intl with the Supabase session refresh (0027). Metadata
  via `metadata` / `generateMetadata`, `app/sitemap.ts`, `app/robots.ts` (0028).
- Git: feature branches → PR into `dev` (integration); `dev` is promoted to `main`
  (production, always deployable); both protected, CI check required (0029);
  production deploys from `main`, every PR gets a preview URL (0007).
- Tests are colocated (`src/**/*.test.tsx`), e2e lives in `e2e/`; coverage is
  risk-weighted — auth/RLS/critical flows get e2e first (0006).
- Every exported component in `src/components/**` ships colocated CSF 3 stories
  covering its meaningful states (variants, interactive, data-edge, theme/locale);
  interactive components require `play` functions with `@storybook/test`; purely
  presentational ones are exempt (0035, 0037, 0041).
- The AI agent is the primary implementer; agent commits carry `Co-Authored-By`,
  agent PRs are labeled (0045). AI assistance is advisory and ADR-grounded: PR
  review citing record numbers (0047), CI-failure triage (0048), changelog drafting
  at `dev`→`main` release (0049), story matrices/play drafts under the 0041 human
  judgment (0050), semantic a11y pass (0051), diff-scoped security review atop a
  blocking secret scan (0055), dependency-update triage on bot PRs (0056),
  translations drafted from the canonical source locale with key parity enforced in
  CI (0054). A scheduled drift audit checks code against accepted ADR Confirmations
  (0053).
- Design tokens: in tokenizable CSS properties only `var(--token)` is allowed and the token
  must exist in the generated registry; components never use raw color/size literals,
  inline-`style` raw values, raw SVG `fill`/`stroke`, or Tailwind's numbered palette; a
  primitive owns no external margin; the token union, lint allowlist, and agent rules are all
  generated from the `@theme` layer, never hand-maintained (0058).
- Components are governed top-down by a composition graph (`composedOf`/`usedIn`, exact-set
  `compositionSignature` v1), checked before a new component is created (0059); imports obey
  primitive↛composite + public-API-only (`index.ts`) + no-circular/no-orphans, reconciled
  against the dependency-cruiser import graph (0060). Roles/classes come from human-authored
  controlled vocabularies under `src/design-system/` — `usage-roles.ts`, `archetypes.ts`, the
  archetype→states registry, the state-precedence matrix (0061).
- Each component ships a typed `design-intent.ts` at Definition-of-Ready: API derived from the
  `usedIn` union (not guessed), slot-vs-variant boundary recorded with rationale, state
  coverage by subtraction from the 0061 archetype set (`applicable:false` requires a rationale)
  (0062). API approval uses an ephemeral Figma-image artifact (figma server image capability,
  never its code path, never the agent's own render) sealed by `renderHash` +
  `figmaFileVersion` as a drift detector (0063); a Defect Log of missing/ambiguous rules is
  filled in review, and invariants graduate into Stage-1 checks on first violation (0064).

## Restrictions

- `any` is disallowed (`@typescript-eslint/no-explicit-any`) — use `unknown` +
  narrowing (0003).
- The Edge runtime is per-route opt-in, never the default (0004). pnpm / yarn / bun
  are not used (0017).
- The service-role key never reaches the client and is confined to trusted
  server-only contexts (0010). Secrets are never importable into client code
  (`server-only` fence, 0020). Credentials in `.mcp.json` are env-references, never
  literals; servers pinned, official/first-party, least-privilege tokens (0042).
- Server data is never mirrored into Zustand; optimistic state lives in the Query
  cache, not Zustand; Server Components never import stores (0023).
- No manual `useMemo` / `useCallback` / `React.memo` — the React Compiler owns
  memoization; exceptions are rare and documented (`"use no memo"`) (0033).
- No `tailwind.config.js` — CSS-first configuration only (0024). Token values are
  code-canonical: Figma conforms to code and never forks it; the figma MCP server is
  read-only (0065, 0044).
- CSF 2 (`Template.bind({})`) and `storiesOf` fail lint; MDX never defines stories
  (0035). Snapshot baselines update only as a reviewed action (0039). The
  test-runner contributes no coverage and duplicates no assertion suite
  (0036, 0040). a11y opt-outs only as explicit, reviewed per-story `a11y` parameters
  with a stated reason (0038).
- Coverage below 80% blocks merge; only `hotfix/*` / `hotfix`-labeled PRs bypass the
  threshold — and nothing else of the gate (0031).
- No global CI retry policy; flaky tests are quarantined explicitly (annotated skip
  + tracked issue, time-boxed), never papered over with retries (0048).
- Human-only actions: accepting ADRs, repo/branch-protection settings, production
  promotion/rollback, provisioning/rotating/revealing secrets, editing
  `constraints.md`, merging into `dev`/`main` (0045). Every PR requires human
  approval — AI review never substitutes (0046, 0047).
- Accepted ADRs are never edited in place — changes go through a superseding record
  (0001).
- Supabase usage stays within the Postgres + RLS + Auth baseline; Storage / Edge
  Functions / Realtime each need their own ADR first (0009). External error tracking
  (e.g. Sentry) is deferred to its own ADR (0021).
- In `src/components/**`: no raw color/size literals, inline-`style` raw values, raw SVG
  `fill`/`stroke`, or Tailwind numbered-palette classes; the token allowlist + agent rules are
  generated, never hand-written (0058). Primitives never import composites; cross-component
  imports go through `index.ts`; no import cycles or orphan modules (0060).
- The agent never approves its own visual baseline (Chromatic UI, human-only) and is never
  shown its own implementation during API approval — the proof is Figma pixels it does not
  control (0063, 0046). Controlled-vocabulary entries are human-authored; a rename/merge/split
  is a governed migration with an owner, and a component fitting no archetype escalates to a
  human (0061, 0064).
