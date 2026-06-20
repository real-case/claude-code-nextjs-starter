# AI-infrastructure showcase site — brief & build plan

> **Status:** planning artifact (not wired into the build). Describes a standalone
> documentation site that showcases how this repository's AI infrastructure is set up —
> its strengths, the parts it is made of, and the problems each part solves.
> The site ships in two releases: a documentation MVP **without** interactive widgets,
> then iterative widget enhancement (§2.7). This file is a plan; no code depends on it yet.

---

## Part 1 — Brief

### 1.1 Purpose

Build a standalone, public documentation site that presents this repository as a
**reference for how AI infrastructure should be set up in a software project**. It must
answer three questions for a visitor, in order:

1. **What problem does this solve?** — an LLM is a probabilistic implementer; left
   unconstrained it hallucinates token names, invents props, imports across boundaries,
   and silently skips states.
2. **What is it made of?** — the concrete parts: a decisions-first ADR process, Claude
   Code hooks, ~20 deterministic `check:*` gates, single-source codegen, skills,
   review subagents, advisory-AI jobs, an MCP toolchain, and a CI backstop.
3. **Why is it strong?** — every rule is _machine-checkable_, _single-sourced_, and
   _self-enforcing_; AI is advisory, humans gate the irreducible decisions.

### 1.2 Audience (dual)

One site, two reading depths via **progressive disclosure** on every page:

| Reader                                          | Wants                                            | Served by                                                                                               |
| ----------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| **Showcase visitor** (client, employer, peer)   | A fast, visual "this is impressive and coherent" | Page hero: one metaphor, one focal figure (static in the MVP, interactive later), problem in a sentence |
| **Onboarding engineer** (adopting the template) | Accuracy, runnable detail, "why exactly this"    | Page body: real file paths, gate names, code excerpts, `npm run …` commands, repo links                 |

### 1.3 Decisions locked (this session)

| Axis          | Decision                                   | Consequence                                            |
| ------------- | ------------------------------------------ | ------------------------------------------------------ |
| Audience      | Both — showcase **and** onboarding         | Progressive disclosure, not two sites                  |
| Format        | Standalone docs site (Astro **Starlight**) | Separate deploy; React "islands" for interactivity     |
| Language      | **English** only                           | Matches existing ADR/README corpus and the cspell gate |
| Interactivity | **Live interactive widgets**               | The differentiator — but a **post-MVP** layer (§2.7)   |
| Rollout       | **MVP docs first, widgets later**          | Ship a complete static site, then enhance iteratively  |

### 1.4 Governing principle — the site is single-sourced from the repo

The project's thesis is _"rules are machine-checkable, generated from a single source,
and proven to enforce themselves."_ A showcase of that thesis that is itself hand-typed
**refutes its own claim** the moment a number drifts. Therefore:

> Everything that **can** be derived from the repository is derived by a build-time
> script, never re-typed into prose.

This is both an integrity guarantee and the site's strongest headline:
_"this documentation is generated from the repository it describes."_

**Concrete evidence this matters:** `AI-GUARDRAILS.md` currently states "64 ADRs", but
`docs/decisions/` holds **74** (0001–0074). A hand-typed showcase would inherit that
drift; a generated one cannot.

### 1.5 Success criteria

**MVP (Release 1) is done when:**

- A visitor grasps the core thesis (probabilistic writer + deterministic verifiers) in
  under 30 seconds, from the landing hero alone.
- Every quantitative claim on the site (ADR count, gate list, skill/agent list, import
  graph) is read from the repo at build time — zero hand-maintained numbers.
- Every page is complete with a static figure in each widget slot — the site reads as
  finished, with no JavaScript widgets yet.
- An engineer can go from any page to the exact source file / command that backs it.
- Builds and deploys independently of `next build`.

**Post-MVP (Release 2+) adds:**

- The thesis-carrying widgets ship first — _defense-in-depth explorer_ and
  _gate-catches-a-violator_ — each swapping in for its static fallback, on the
  already-live site.

### 1.6 Scope / non-goals

**In scope:** narrative + reference for the AI-infrastructure layer; interactive widgets
(post-MVP); build-time data extraction from the repo.

**Out of scope:** a verbatim copy of `AI-GUARDRAILS.md` / `README.md` (the site links to
them as the "deep source"); a public, write-enabled playground that runs the repo's gates
server-side (use pre-recorded outputs); documenting application/feature code that is not
part of the AI-infrastructure story.

---

## Part 2 — Detailed plan

### 2.1 Stack decision: Astro Starlight

Recommended over Nextra **because** the chosen format is a standalone site with heavy,
selective interactivity:

- **Islands architecture** — static, fast content by default; widgets hydrate in
  isolation (`client:visible`). This is also what makes the MVP-first rollout clean: the
  static site is the default, widgets are added later as isolated islands with no global
  React runtime.
- **Batteries included** — search (Pagefind), dark mode, nav, i18n routing (kept for
  later even if launching English-only), versioning.
- **Diagrams as code** — Mermaid via a rehype plugin (see §2.5), critical for accuracy.
- **Deploys to Vercel** alongside the main app without coupling to `next build`.

Nextra would win only under the rejected "section inside the Next app" option.

### 2.2 Information architecture

Every page uses the same frame: **Problem (what goes wrong with a bare LLM) → Part of the
infrastructure → How it closes the gap.** Page tree, grounded in the real repo:

| Slug                  | Title                       | Problem it frames                                        | Repo anchors                                           |
| --------------------- | --------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| `00-why`              | The thesis                  | Probabilistic writer errs in many ways                   | `AI-GUARDRAILS.md §1`                                  |
| `01-decisions-first`  | ADR process                 | Prose conventions rot, untethered to code                | `docs/decisions/*`, `adr.py`, `CLAUDE.md` is generated |
| `02-defense-in-depth` | Three layers                | Which guarantee does a rule need?                        | `AI-GUARDRAILS.md §2`                                  |
| `03-edit-time`        | Claude Code hooks           | Catch mistakes at the keystroke                          | `scripts/hooks/*`                                      |
| `04-the-gates`        | `check:*` gates             | A green gate must mean the property holds                | `package.json` scripts, `check:gates`                  |
| `05-single-source`    | Anti "knowledge laundering" | The rule the agent reads must equal the rule CI enforces | `gen:tokens`, `gen:types`                              |
| `06-skills-subagents` | Skills & review subagents   | Encode workflows; independent review                     | `.claude/skills/*`, `.claude/agents/*`                 |
| `07-advisory-ai`      | Advisory AI jobs            | AI advises, humans gate                                  | `scripts/ai/*`, ADR 0048–0057                          |
| `08-mcp`              | MCP toolchain               | Tooling with least-privilege, env-ref secrets            | `.mcp.json`, ADR 0044                                  |
| `09-ci-gate`          | The CI backstop             | `green local == green CI`                                | `.github/workflows/ci.yml`                             |

### 2.3 Dual-audience progressive disclosure

Each page is authored in three stacked depths:

1. **Hero / narrative** — one metaphor, one focal figure (static in the MVP, interactive
   later), the problem in a single sentence. The showcase visitor can stop here.
2. **How it works** — concrete file paths, gate names, code excerpts, a flow diagram.
3. **Run it yourself** — the exact command (`npm run check:gates`), expected output, and
   a link to the source in the repo.

Same content, three depths. Top for the visitor, bottom for the engineer.

### 2.4 Single-source data layer (the integrity backbone)

A build-time script reads the repository and emits JSON the pages render from. Runs on
`prebuild` so the site cannot ship stale numbers.

**Script:** `scripts/build-showcase-data.mjs` (in the showcase project, reading the repo).

**Outputs → `src/data/`:**

| File               | Source of truth                                          | Extraction                                                          |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------- |
| `adrs.json`        | `docs/decisions/*.md`                                    | Parse frontmatter (number, title, status, supersedes/superseded-by) |
| `gates.json`       | `package.json` `scripts`                                 | Filter keys matching `check:*`, `typecheck`, `lint`, `format:check` |
| `skills.json`      | `.claude/skills/*/SKILL.md`                              | Read frontmatter (name, description)                                |
| `agents.json`      | `.claude/agents/*.md`                                    | Read frontmatter (name, description, tools)                         |
| `advisory-ai.json` | `scripts/ai/*.mjs` + ADR 0048–0057                       | File list + ADR cross-refs                                          |
| `mcp.json`         | `.mcp.json`                                              | Server names only (never values)                                    |
| `import-graph.svg` | `depcruise src --output-type dot`                        | DOT → SVG at build                                                  |
| `tokens.json`      | `src/design-system/tokens.*` (generated by `gen:tokens`) | Import the generated artifact                                       |

**Data contract example (`adrs.json`):**

```jsonc
{
  "generatedAt": "2026-06-19T00:00:00Z",
  "total": 74,
  "byStatus": { "accepted": 73, "proposed": 1 },
  "records": [
    {
      "number": "0033",
      "title": "Design tokens",
      "status": "proposed",
      "supersedes": null,
      "supersededBy": null,
      "href": "https://github.com/<org>/<repo>/blob/main/docs/decisions/0033-design-tokens.md",
    },
  ],
}
```

**Rule:** any number or list shown on the site (ADR count, gate names, skill/agent
roster, import graph) comes from these files. None is hand-typed.

### 2.5 Visual & diagram pipeline

Principle: **diagram-as-code wherever possible**, so figures cannot drift from the repo.
In the MVP these figures also stand in for the future widgets (the "Static fallback"
column in §2.6), so the site is visually complete before any JavaScript ships.

| Figure type                                        | Tool                                        | Why                             |
| -------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| Flows, lifecycle, timelines                        | **Mermaid** in `.mdx`                       | Text in git, diffable, editable |
| Import / layer graph                               | **dependency-cruiser → DOT → SVG** at build | Generated from real code        |
| Concept schematics (layer pyramid, keystroke→main) | Hand-drawn **SVG**, authored once           | Semantic, change rarely         |
| Storybook / Chromatic / CI screenshots             | Playwright auto-capture at build            | Stay fresh, never stale         |
| Live demos                                         | React islands (§2.6)                        | The differentiator — post-MVP   |

Hard rule: **no hand-made raster diagrams** — they rot first and undermine trust.

### 2.6 Interactive widget catalogue (post-MVP)

Widgets are **Release 2+ enhancements** (§2.7), not part of the MVP. Each is a Starlight
island that swaps in for the static figure already standing in its slot, so a page is
never blocked on it. Each proves exactly one claim. Priority maps to the iteration
schedule — P0 → iteration A, P1 → B, P2 → C.

| #   | Widget                            | Claim it proves                                                                                      | Static fallback (MVP)                           | Page      | Priority |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --------- | -------- |
| 1   | **Defense-in-depth explorer**     | Every rule lives in one of three layers; where each fires                                            | Static SVG layer pyramid                        | `02`      | P0       |
| 2   | **Gate catches a violator**       | Gates are self-enforcing (P6) — toggle a violation, a `check:*` turns red with real error text       | Annotated screenshot of a red `check:*` run     | `04`      | P0       |
| 3   | **Probabilistic → deterministic** | A toy "agent" proposes a bad change; verifiers catch it                                              | Mermaid flow: agent → verifiers                 | `00`      | P1       |
| 4   | **Single-source demo**            | Change a token in `@theme` → union + allowlist + agent-rules regenerate; CI-drift catches a mismatch | Mermaid flow: `@theme → gen:tokens → artifacts` | `05`      | P1       |
| 5   | **ADR lifecycle explorer**        | `proposed → review → accept (human) → implement → sync`; highlights the human-only gate              | Mermaid lifecycle diagram                       | `01`      | P2       |
| 6   | **Dependency-graph explorer**     | Hover a layer → forbidden import directions light up                                                 | Generated `import-graph.svg` (static)           | `06`      | P2       |
| 7   | **"Where it fires" timeline**     | `keystroke → edit → pre-PR → CI → merge`; no stage trusts the previous                               | Static SVG timeline                             | `02`/`09` | P2       |

Each island stays self-contained and is fed from `src/data/*.json` where it shows counts
or lists.

### 2.7 Implementation plan — MVP first, widgets later

The site ships in two releases. **Release 1 is a complete, deployable documentation site
with no interactive widgets**: every widget slot is filled by the static figure from
§2.6, so each page reads as finished. **Release 2+ then swaps widgets in one at a time**
as drop-in Starlight islands — each replaces one static figure on an already-live page,
so no iteration blocks the release or risks the rest of the site.

**Release 1 — MVP (documentation, no interactive widgets) → deploy**

| Phase                     | Deliverable                                                                                                  | Acceptance                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| **0 · Scaffold**          | Starlight project, Vercel deploy target, dark theme, placeholder nav                                         | Site builds and deploys empty                      |
| **1 · Data layer**        | `build-showcase-data.mjs` + `src/data/*.json` on `prebuild`                                                  | All §2.4 files generate; numbers match repo        |
| **2 · Content + figures** | All 10 pages (§2.2) as `.mdx` with problem/part/solution + Mermaid, and a static figure in every widget slot | Pages render; no hand-typed counts; no empty slots |
| **3 · Polish + deploy**   | Pagefind search, OG images, build-time screenshots, dark/a11y QA, production deploy                          | Search works; figures fresh; site is live          |

Do Phase 1 **before** Phase 2 — the data layer is the integrity foundation.

**Release 2+ — iterative widget enhancement (each a drop-in island)**

| Iteration  | Widgets (from §2.6)                                          | Replaces the static fallback on |
| ---------- | ------------------------------------------------------------ | ------------------------------- |
| **A · P0** | Defense-in-depth explorer · Gate catches a violator          | `02`, `04`                      |
| **B · P1** | Probabilistic → deterministic · Single-source demo           | `00`, `05`                      |
| **C · P2** | ADR lifecycle · Dependency-graph · "Where it fires" timeline | `01`, `06`, `02`/`09`           |

Each iteration is independent and shippable on its own; the MVP stays live throughout, and
a widget that is dropped or deferred simply leaves its static figure in place.

### 2.8 Proposed file tree (future site)

```text
ai-infra-showcase/
├─ astro.config.mjs              # Starlight + mermaid rehype
├─ package.json                  # "prebuild": "node scripts/build-showcase-data.mjs"
├─ scripts/
│  └─ build-showcase-data.mjs    # Release 1 — reads ../ (the repo) → src/data/*.json
├─ src/
│  ├─ data/                      # generated (Release 1); git-ignored
│  │  ├─ adrs.json
│  │  ├─ gates.json
│  │  ├─ skills.json
│  │  ├─ agents.json
│  │  ├─ advisory-ai.json
│  │  ├─ mcp.json
│  │  └─ import-graph.svg
│  ├─ components/                # interactive islands — Release 2+, one per iteration
│  │  ├─ DefenseInDepth.tsx
│  │  ├─ GateCatchesViolator.tsx
│  │  ├─ ProbabilisticToDeterministic.tsx
│  │  ├─ SingleSourceDemo.tsx
│  │  ├─ AdrLifecycle.tsx
│  │  ├─ DependencyGraph.tsx
│  │  └─ FiringTimeline.tsx
│  └─ content/docs/              # Release 1 — pages with static figures in widget slots
│     ├─ 00-why.mdx
│     ├─ 01-decisions-first.mdx
│     ├─ 02-defense-in-depth.mdx
│     ├─ 03-edit-time.mdx
│     ├─ 04-the-gates.mdx
│     ├─ 05-single-source.mdx
│     ├─ 06-skills-subagents.mdx
│     ├─ 07-advisory-ai.mdx
│     ├─ 08-mcp.mdx
│     └─ 09-ci-gate.mdx
└─ public/og/                    # generated OG images
```

### 2.9 Anti-patterns to avoid

- **Hand-typed numbers and lists.** ADR counts, gate names, the import graph — derive
  them, or the first edit makes the site a liar.
- **Raster diagrams.** They rot first. Mermaid / SVG-as-code only.
- **Blocking the MVP on a widget.** Every widget slot ships a static figure first; the
  interactive version is a later, independent swap.
- **Interactivity confetti.** Animation without a claim is noise. One widget = one
  verifiable assertion.
- **Cloning `AI-GUARDRAILS.md`.** The site is a separate product with narrative and
  interactivity; the repo docs are the "deep source" it links to.
- **Server-side gate execution in public.** Pre-record `check:*` outputs; do not expose a
  live runner.

### 2.10 Open decisions (defer to build time)

- Repository topology: separate repo vs. `apps/showcase` in this repo (affects how
  `build-showcase-data.mjs` resolves paths).
- Whether the showcase gets its own minimal `decisions-first` micro-process (1–2 ADRs:
  "why Starlight", "why single-sourced data") to dogfood the thesis.
- Analytics / privacy posture for a public portfolio site.

---

## Appendix A — Repo infrastructure → page mapping (current inventory)

| Infrastructure part                | Where it lives                                                    | Showcased on |
| ---------------------------------- | ----------------------------------------------------------------- | ------------ |
| ADR corpus (74 records, 0001–0074) | `docs/decisions/`                                                 | `01`, `05`   |
| ADR tooling                        | `.claude/skills/adr/scripts/adr.py`                               | `01`         |
| Generated agent brief              | `CLAUDE.md` (synced from accepted ADRs)                           | `01`, `05`   |
| PreToolUse / PostToolUse hooks     | `scripts/hooks/guard-protected-files.mjs`, `post-edit-checks.mjs` | `03`         |
| Deterministic gates (~20)          | `package.json` `check:*`, `typecheck`, `lint`                     | `04`         |
| Self-testing gates (P6)            | `scripts/check-gates.mjs`                                         | `04`         |
| Single-source codegen              | `gen:tokens`, `gen:types`                                         | `05`         |
| Skills (19)                        | `.claude/skills/*`                                                | `06`         |
| Review subagents (7)               | `.claude/agents/*.md`                                             | `06`         |
| Advisory AI jobs                   | `scripts/ai/*`, `.github/workflows/ai-*.yml`                      | `07`         |
| MCP toolchain                      | `.mcp.json`                                                       | `08`         |
| CI workflows                       | `.github/workflows/{ci,codeql,chromatic,links}.yml`               | `09`         |

## Appendix B — The three layers (content reference)

| Layer             | Guarantee                                             | Failure mode          | Lives in                                                                                   |
| ----------------- | ----------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| **Deterministic** | Precision — green means the property holds            | Blocks merge (CI red) | `check:*`, ESLint, `tsc`, coverage, `adr.py lint`, gitleaks, CodeQL                        |
| **Structural**    | Recall — lowers violation frequency in the agent loop | Warns / nudges        | `ds:*` helpers, `.claude/skills/*`, PostToolUse hints                                      |
| **Judgment**      | The irreducible human call                            | Requires a person     | Accept ADR, approve PR, merge, prod promote, secrets, `constraints.md`, Chromatic baseline |
