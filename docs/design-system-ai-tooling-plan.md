# Design-System Governance — Design Rationale

Why the AI-assisted design-system governance layer is built the way it is: typed design
intent, token/composition/state enforcement, anti-hallucination approval, and the feedback
loop that keeps the rules from rotting. This is a **rationale doc**, not a tracker — the
decisions themselves live in ADRs **0058–0064** (plus the AI-process records 0046–0057),
and the runtime artifacts live in [`src/design-system/`](../src/design-system/). Read this to
understand the shape before you extend it.

> The companion how-it-fits-together docs are [`AI-GUARDRAILS.md`](../AI-GUARDRAILS.md)
> (project-wide deterministic governance) and
> [`STORYBOOK-GUARDRAILS.md`](../STORYBOOK-GUARDRAILS.md) (the component layer). Where this
> doc and an accepted ADR disagree, the ADR wins.

## 1. The spine — three verification layers

Every rule lands in **exactly one** of three layers, chosen by the _kind_ of guarantee it
needs:

1. **Deterministic** (CI gates, **block merge**) — _precision over recall_. The guarantee
   lives here; a green gate means the property holds. Token lints, import-boundary checks,
   per-state axe/visual, anti-drift fitness functions.
2. **Structural** (skills + graph, **warn**) — _recall over precision_. Reduces violation
   frequency inside the agent's own loop; never the guarantee. Composition-signature checks,
   state-coverage skills, `/check-tokens`.
3. **Judgment** (human gates) — _the irreducible_. Intent collisions, state-set approval,
   composition-boundary calls, baseline approval, anything irreversible.

Both the AI-process automation (ADRs 0046–0057) and the design-system component governance
(0058–0064) obey **ADR-first** (0001): a decision no ADR covers is recorded **before** code
depends on it.

## 2. Problem traceability (P1–P9)

The nine failure modes the layer exists to prevent, and where each is addressed:

| P#  | Problem                                                        | Primary layer              | Where addressed                                 |
| --- | -------------------------------------------------------------- | -------------------------- | ----------------------------------------------- |
| P1  | Token-rule violations (raw value; primitive not semantic)      | deterministic              | token lints; ADR 0058                           |
| P2  | Structural duplication of components (isomorphic composition)  | structural                 | composition graph + signature skill; ADR 0059   |
| P3  | Intent duplication (one usage-role across components)          | judgment                   | collision gate; ADR 0061                        |
| P4  | Agent hallucination during API derivation/approval             | deterministic (proof)      | Figma approval artifact; ADR 0062/0063          |
| P5  | Composition requirements leaking into a primitive (lost reuse) | deterministic + structural | boundary check; ADR 0058/0060                   |
| P6  | Agent rules diverging from CI ("knowledge laundering")         | deterministic              | single-source codegen; test-the-test; ADR 0058  |
| P7  | Context loss returning to a component in a batch pass          | judgment/process           | Defect Log; batched approvals                   |
| P8  | Incomplete state coverage (empty/overflow/loading skipped)     | structural                 | archetype registry + coverage skill; ADR 0061   |
| P9  | Drift of stored artifacts vs live sources after approval       | deterministic              | reconciliation fitness functions; ADR 0063/0064 |

## 3. Terminology — two graphs (do not conflate)

- **Composition dependency graph** — an **analytical artifact**. Built top-down by
  interface/behavioral commonality, **before code**. Machine-readable JSON; edges
  `composedOf` / `usedIn`; the source for API derivation and structural deduplication. Figma
  structure is a _hint_, not the truth. Lives at
  [`src/design-system/composition-graph.json`](../src/design-system/composition-graph.json)
  (ADR 0059); empty in this template until the first component lands.
- **Import graph** — **code-derived**, produced by `dependency-cruiser`. Verifies the
  implementation hasn't diverged from the design. It does **not** build the composition graph
  and does **not** derive commonality. (ADR 0060.)

The P9 anti-drift reconciliation gate (`check:graph`) compares the two: a mismatch fails CI
and forces an update of either the graph or the code — which also answers "who keeps the
graph fresh."

## 4. The deterministic layer (CI gates, block merge)

The guarantees — precision over recall. ADRs 0058, 0060, 0062, 0063; reuses 0039/0043; adds 0055. Honour the lean posture: heavy jobs stay inert/local until justified.

**Tokens (P1/P5/P6, ADR 0058).** The ESLint layer (`check:tokens`, scoped to
`src/components/**`) bans raw color/size literals, `style={{…}}` raw values, raw
`fill`/`stroke` in SVG, and Tailwind's numbered palette; a primitive carries no external
margin. A stylelint **inversion** (only `var(--token)` in tokenizable properties) +
**existence** rule (the token is in the generated registry) is the wired-when-component-CSS-
appears extension — today styling is Tailwind-in-TSX, so the ESLint surface is what fires.

**Imports — dependency-cruiser (P2/P5, ADR 0060).** `check:boundaries` enforces
`no-circular` (a cycle breaks the L1 wave topology) and primitive↛composite. `public-API-only`
(needs index barrels) and `no-orphans` (needs Next entry-point config) stay deferred to avoid
false positives — both documented in `.dependency-cruiser.cjs`.

**Anti-drift fitness functions (P9).** `check:design-intent` reconciles each component's
`design-intent.ts` against reality on five axes: `ApiContract` ↔ actual props (declared
`api.variants` matches the real cva/union axes; declared slots have a basis; `ownsExternalMargin:false`
is backed by a no-external-margin scan); states ↔ stories, both directions (a `demoStory` must
resolve; a story tagged for an undeclared state is contract expansion); meta ↔ composition
graph; state coverage by subtraction; interactive-archetype play presence. `check:graph`
reconciles the composition graph against the import graph. `check:seals` (ADR 0063) validates
Figma drift-seal shape/presence — a clean no-op until a Figma project + seals exist.

**Meta (P6).** `check:gates` is the test-the-test: it plants a violator per custom rule,
asserts the gate exits non-zero, and restores state — the guards are themselves guarded.
Single-source: the lint allowlist **and** the agent-rules reference are generated from the
token registry by `gen:tokens` and CI fails on drift — no token is duplicated in prose.
Localization parity (ADR 0055): `check:i18n` is a blocking key-parity + ICU-syntax check.

## 5. The generation layer (skills + agent rules, advisory)

Reduce violation frequency inside the agent loop — recall over precision; the guarantee stays
in the deterministic layer. ADRs 0048–0057; 0058/0059/0061.

**Design-system skills.** `CLAUDE.md` and the agent rules reference the **generated**
`tokens.agent-rules.md` (never a prose retelling). `/check-tokens` runs the token lint before
commit. The **composition-signature** skill (`ds:signature`) checks a proposed component's
v1 signature (the exact set of composed primitive ids — no topology; subtree isomorphism is
deferred until the Defect Log shows omissions) against the graph before creation. The
**state-coverage** skill (`ds:states`) prints the archetype's mandatory state set so coverage
starts from the full set, not memory.

**Advisory AI jobs (ADRs 0048–0057).** Each is advisory, ADR-cited, and **never a required
check**: AI PR review (diff + ADR corpus, citing record numbers, 0048), CI-failure triage
(real regression / flaky-with-evidence / infra, no global retry, 0049), changelog drafting at
`dev`→`main` (0050), story-matrix drafting against the archetype registry (0051), semantic
a11y over built-Storybook states (0052), diff-scoped security layer-2 against recorded
invariants (0056), and Renovate-class dependency triage (0057). All are **inert until a human
provisions `ANTHROPIC_API_KEY`** and self-activate when it lands (`scripts/ai/*` +
`.github/workflows/ai-advisory.yml` / `ai-ci-triage.yml`).

## 6. API derivation & anti-hallucination approval

Derive the contract from usage, and prove variants against pixels — not against the agent's
own output. ADRs 0062, 0063.

- **Usage-driven API.** The component's contract is the union of all `usedIn` requirements
  (not invented props); `check:design-intent` reconciles it against the real cva/union axes.
- **Composition-boundary decision.** Each axis is recorded as a **slot** (orthogonal
  combinatorial variation) or a **variant/flag** (closed axis), with a rationale.
- **`design-intent.ts` at Definition-of-Ready.** The API is _designed_ before it is
  implemented (otherwise DoR collapses into DoD). Field map in §A2.
- **State coverage by subtraction.** Classify by archetype → take the mandatory set → mark
  each `applicable` true/false; a `false` without a rationale is a masked omission and is
  rejected.
- **Ephemeral reconciliation artifact (ADR 0063).** At API approval each variant is shown
  beside its real Figma frame via the figma server's image capability — **never** its code
  path, **never** the agent's own render — with a traversal-completeness report. After
  approval the artifact is discarded; the **seal** (`renderHash` + `figmaFileVersion`) remains
  in the intent as the only trace, a drift detector. Inert until a human wires a Figma file.
- **`behavior`** (ref-forwarding, controlled/uncontrolled, aria, focus) is engineering-built,
  never derived from Figma.

## 7. Human gates (judgment, not automated)

Keep judgment where it belongs, and only there. ADRs 0046, 0047, 0061, 0063.

- **usageRole collision** → present both intent files side by side (duplicate vs deliberate
  specialization). `ds:escalations` groups specs by `usageRole` and surfaces shared roles.
- **State approval — default once, escalate on deviation.** The archetype default set is
  approved once via the registry; on a component only a deviation escalates (an
  `applicable:false` on a mandatory state, or an added state); a full match auto-approves.
  `ds:escalations` reports deviation-only, and prints the **rubber-stamp metric** (auto-approve
  vs escalate share) — reduce false judgment only by moving it into the deterministic/structural
  layers, never by touching real gates.
- **`combinations`** decided once per class, recorded in the intent.
- **Visual-regression baseline approval** is human-only — the agent never approves its own
  baseline (Chromatic UI, ADR 0043/0047).
- **Figma-drift re-approval** — a seal mismatch re-opens the affected variants.
- Mandatory gates stay on the irreversible (RLS, prod migrations, auth middleware, payment
  webhooks, secrets) and the ADR 0046 human-only list (ADR acceptance, repo settings,
  promotion, secrets, `constraints.md`, merges to `dev`/`main`).

## 8. The feedback loop (defense against degradation)

Stop the rules from rotting. ADR 0064; reuses 0049/0054.

The [Defect Log](design-system/defect-log.md) is a journal of _missing or ambiguous rules_
(not every error). Each entry carries a root-cause class (rule-absent / didn't-reach-agent /
ambiguous / not-auto-caught) that determines the fix, and filling it is a mandatory action of
the review/escalation phase. **Reactive fitness growth:** a new invariant starts as an ADR
Confirmation enforced _by review_; on its **first violation** it earns an executable check and
rises into the deterministic layer — the gate set grows from evidence, not guesswork. Dictionary
governance (a rename/merge/split is a migration of every referencing intent, with an owner) and
component-deprecation (the fate of a graph node + its `usedIn` edges) are recorded in
[`governance.md`](design-system/governance.md) **before** the first such event.

## 9. Batch development (L1 waves) — a convention

For parallel multi-component passes (≥5–6 components), kept as a convention rather than an ADR:
fix the shared contract (tokens + grid/rhythm + state-precedence) **before** launching parallel
agents; states are in L1, not deferred (the set comes from the archetype registry, not Figma); a
composite launches once the primitive's **interface** is ready (not its production readiness);
stories use only structural composition on mocks (no business logic); and the approvals are
**batched** into one Definition-of-Ready session per wave (all state deviations, slot/flag
boundaries, escalations at once, backed by `ds:escalations`). At the end of a wave,
`ds:tokens-table` aggregates each component's declared + source-utility tokens into a table so a
human can spot semantic inconsistency (different tokens for one visual role).

## Appendix A1 — Archetype→states registry

The canonical source is [`src/design-system/states.ts`](../src/design-system/states.ts)
(`STATE_AXES` + `ARCHETYPE_STATES`); this is the summary. States are built **by subtraction**:
classify → take the mandatory set → mark `applicable` with a `rationale` when `false`, so the
agent cannot silently skip a state. Axes: **Data** (`empty`,`single`,`many`,`overflow`,`error-fetch`)
· **Interaction** (`default`,`hover`,`focus-visible`,`active`,`disabled`,`read-only`) ·
**Process** (`idle`,`loading`,`success`,`error-action`,`retry`) · **Validation**
(`pristine`,`valid`,`invalid`,`warning`) · **Content-bounds**
(`min/max-content`,`line-wrap`,`truncation`,`cjk`,`rtl`).

| Archetype                                     | Mandatory axes (summary)                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `action-trigger` (button, icon-button, link)  | interaction + process (if async) + content-bounds; no data                               |
| `text-input` (input, textarea, search)        | interaction (incl. `read-only`) + validation + data(`empty`/`overflow`) + content-bounds |
| `selection-control` (checkbox, radio, switch) | interaction + validation + `checked`/`unchecked`/`indeterminate`                         |
| `categorical-indicator` (badge, tag, chip)    | interaction(if interactive) + content-bounds; values via `variants`                      |
| `collection` (list, table, grid, menu)        | **data** (`empty`…`error-fetch`, critical) + process + interaction + content-bounds      |
| `container` (card, panel, dialog, sheet)      | data(`empty`/`overflow`) + process(if async) + content-bounds                            |
| `feedback` (alert, toast, banner)             | severity via `variants` + process(`dismissing`) + content-bounds                         |
| `navigation` (tabs, breadcrumb, stepper)      | interaction + `selected`/`current`/`complete` + data(`overflow`)                         |
| `media` (avatar, image, thumbnail)            | process(`loading`/`error-load`) + data(`empty`) + content-bounds                         |
| `disclosure` (accordion, popover, tooltip)    | `collapsed`/`expanded`/`transitioning` + interaction + content-bounds                    |

> The registry defines **which** states exist; behaviour under **simultaneity** is the separate
> state-precedence matrix ([`state-precedence.ts`](../src/design-system/state-precedence.ts)). A
> component fitting no archetype → 👤 escalation: a new archetype (a DS decision) or a rethink of
> the component boundary.

## Appendix A2 — `design-intent.ts` field map

The typed schema is [`src/design-system/design-intent.ts`](../src/design-system/design-intent.ts)
(ADR 0062); a spec lives beside each component, references the external registries (never inlines
them), and is the source of truth for API derivation. The field map:

- `meta` — `id`, `kind` (`primitive`|`composite`|`pattern`), `archetype`, `compositionSignature`,
  `composedOf[]`, `usedIn[]`.
- `usageRole` — from `usage-roles.ts` (controlled; collisions escalate).
- `variants` — `items[]` each with `figmaNodeId` + `figmaDeepLink` + `axis` + optional `seal`
  (`figmaFileVersion` + `renderHash`); `traversalComplete` + notes.
- `states` — `StateEntry[]`: `name`, `applicable`, `rationale?` (**required when `false`**),
  `demoStory?` XOR `demoRationale?` (when `applicable`), `figmaNodeId?` + `seal?`, `tokens?`
  (typed from the registry), `worstCaseForOverflow?`.
- `combinations` — `orthogonalAxes[]`, `allowed[][]`, `forbidden[][]` (recorded judgment).
- `api` — `slots[]` (+ rationale), `variants[]` (+ rationale), `ownsExternalMargin: false`.
- `behavior` — `refForwarding`, `controlled`, `ariaPassthrough[]`, `focusManagement?`,
  `surfacedFromComposition?` (engineering-built, **not** from Figma).
- `alignment` — `alignmentBox`, `rhythmSource: 'composition-container'`, `baseline?`.

**Verification mapping:** token fields → token lints; `compositionSignature` → graph check;
`states` → human gate + coverage skill + states↔stories fitness fn; `variants[].figmaNodeId` →
approval artifact (image capability); `api` ↔ props → fitness function; `seal` ↔ live render →
drift check.

## Human-contribution points (the un-generatable inputs)

These shape everything downstream and **cannot be generated** — they are designer/architect
decisions and the project's true bottleneck. This template ships them as **ratified seed
baselines**; fill them with your product's real vocabulary as it emerges:

1. [`usage-roles.ts`](../src/design-system/usage-roles.ts) — which categories of _intent_ exist
   (drives dedup + part of API derivation).
2. [`archetypes.ts`](../src/design-system/archetypes.ts) + the archetype→states set
   ([`states.ts`](../src/design-system/states.ts)) — which _classes_ of component exist (drives
   the coverage acceptance criteria).
3. The **state-precedence matrix**
   ([`state-precedence.ts`](../src/design-system/state-precedence.ts)) — how simultaneity
   resolves, once, system-wide.
4. Per-class **composition-boundary** (slot vs flag) and **combinations** judgments.

Start with #1 and #2: they are root dependencies. Add a governance owner before the first
rename/merge (§8). Adding an entry is trivial; a rename/merge/split is a governed migration of
every referencing intent file.
