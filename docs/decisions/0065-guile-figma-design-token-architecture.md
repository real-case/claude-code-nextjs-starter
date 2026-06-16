---
status: "accepted"
date: 2026-06-12
decision-makers: Yurii Anichkin
consulted: AI implementer
informed: AI implementer
---

# Guile Figma-exported token architecture: literal three-layer tokens with a shadcn compatibility bridge (supersedes 0025)

## Context and Problem Statement

**0025** chose CSS custom properties mapped into Tailwind's `@theme` (**0024**) as the token
model, layered as a primitive scale plus a small **semantic** set (`--color-primary`,
`--color-muted`, …) that components reference — the shadcn/ui vocabulary (**0026**), with the
semantic layer *aliasing* primitives and light/dark toggled by a root class or `data-`
attribute. That model was a placeholder: the real Guile brand now arrives as a **Figma
variable export** (`guile-design-tokens.css`) whose shape diverges from 0025 in three concrete
ways. (1) It is a **three-layer** system — 171 raw primitives, a spacing/radius/typography
scale, a 65-token **semantic** layer, **and** a 436-token **component** layer
(`--color-c-{component}-{part}[-state]`, 1:1 with Figma) — not the small semantic set 0025
assumed. (2) Its semantic/component tokens carry **literal values** (`#264E36`), not `var()`
aliases of the primitive scale. (3) It uses a `[data-theme="dark"]` selector and names that do
not overlap the shadcn vocabulary (`--color-main-background`, not `--color-background`), so the
existing shadcn components (**0026**) would lose their backing tokens on a straight swap.

The question this record settles: **how does the Guile export become the project's token
source of truth without forking the values that Figma exports, without breaking the existing
components, and without breaking the 0058 token codegen** that parses the CSS layer? It does
not change the *mechanism* of 0024/0025 (CSS variables in `@theme`, runtime theming) — it
restates the token **architecture** those records under-specified.

## Decision Drivers

* **Code is canonical; Figma conforms (0025/0044)** — the export's values must land in code
  **verbatim**, not be re-derived, re-aliased, or "improved" by the agent (anti-hallucination,
  **0063/0064**).
* **The existing components must keep working** — button/card/input/label and the `@layer base`
  reset reference the shadcn semantic names; a swap cannot leave them dangling.
* **One source, no laundering (0058)** — the CSS `@theme`/`:root` layer stays the single source
  the token codegen, lint allowlist, and agent rules are all generated from.
* **Faithful over normalized** — preserve the export's real shape (including its light/dark
  asymmetry) and *record* its defects (**0064**), rather than fabricate missing values to make
  it tidy.
* **One dark convention** — the repo already standardizes on `.dark` (the 0058 agent rules and
  the existing `@custom-variant`); the export's `[data-theme]` should converge on it.

## Considered Options

* **Faithful three-layer port + a `@theme inline` shadcn compatibility bridge** (literal values;
  convert to `.dark`; generalize the 0058 codegen; record export defects in the Defect Log)
* **Normalized, primitive-aliased port** — rewire the ~500 semantic/component tokens to
  `var(--p-*)` primitives and symmetrize light/dark, restoring 0025's "semantic aliases
  primitive" ideal
* **Keep 0025 as-is** — treat the Guile export as a reference and hand-pick a small semantic set
  into the existing shadcn token model

## Decision Outcome

Chosen option: **"Faithful three-layer port + a `@theme inline` shadcn compatibility bridge"**,
because it is the only option that makes the Guile export the source of truth **with zero
fabricated design data** while keeping the existing components alive. Concretely:

* **`src/app/globals.css`** carries the export's four layers — primitives in `:root` (raw, *not*
  exposed as utilities); spacing/radius/typography, the 65 semantic tokens, and the 436
  component tokens in `@theme` (**literal** values, as exported); `[data-theme="dark"]` rewritten
  to `.dark` under the existing `@custom-variant dark (&:is(.dark *))`.
* A **third token layer is now part of the architecture**: component tokens
  `--color-c-{component}-{part}[-state]`, accepted as first-class `@theme` tokens (they back
  `bg-c-*`/`text-c-*` utilities). This is the explicit extension of 0025's two-layer model.
* Semantic tokens hold **literal values** rather than aliasing primitives — a recorded,
  deliberate deviation from 0025. The primitive layer remains as a documented raw scale; rewiring
  to aliases is left to a future refinement, not forced now (it would require inventing
  primitive↔value mappings the export does not assert).
* A **compatibility bridge** — a single `@theme inline` block — aliases the shadcn names the
  existing components consume (`--color-primary`, `--color-background`, `--color-destructive`, the
  `--radius-*`/`--font-*` they use) onto Guile tokens via `var()`. Because `@theme inline` inlines
  the reference, each shadcn utility emits the Guile token's `var()` directly and therefore
  inherits its `.dark` swap with no separate dark bridge.
* The **0058 codegen** (`scripts/gen-tokens.mjs`) is generalized to union token names across all
  `@theme`/`@theme inline` blocks and to register tokens declared only under `.dark`, so the
  asymmetric export is captured without fabrication. The generate→prettier→CI-drift loop is
  unchanged.

This record **supersedes 0025**. Per **0001**/**0045** the formal supersede link-flip (moving
0025 to `superseded`) is performed at the human **acceptance** gate (`adr.py accept 0065`, then
`adr.py supersede --old 0025 --new 0065`); until then 0025 remains the in-force record and 0065
is a proposal.

### Consequences

* Good, because the Guile brand becomes the single token source of truth with the export's values
  preserved verbatim — Figma conforms to code, code does not fork Figma (**0025/0044**).
* Good, because the existing components keep rendering through the bridge, so the port is a
  self-contained PR with no component rewrite (that is a later wave).
* Good, because one parse of the CSS layer still feeds CSS, the TS union, the lint allowlist, and
  the agent rules (**0058**) — no drift, even across the new multi-block structure.
* Good, because the export's real defects (a misspelled dark token; light/dark asymmetry) are
  surfaced in the Defect Log (**0064**) rather than papered over with invented values.
* Bad, because 436 component tokens generate a large utility/allowlist surface, and the literal
  (non-aliased) semantic layer leaves the primitive scale partly vestigial — both deferred clean-ups.
* Bad, because the codegen parser grows more complex (multi-block + dark-name capture); it must
  fail loudly on a malformed `@theme`, per the `gen:types` precedent (**0012**).

### Confirmation

`npm run gen:tokens` regenerates the three artifacts and leaves a clean `git status` (the CI drift
gate, **0058**/**0012**); the generated allowlist contains the Guile semantic **and** component
tokens, including at least one token declared only under `.dark`. Every `var(--…)` referenced in
the `@theme inline` bridge resolves to a token declared in `globals.css` (a structural check, no
dangling references). `npm run typecheck`, `npm run lint`, `npm run check:tokens`, the existing
component tests/stories, and `next build` pass. The export defects are recorded in
`docs/design-system/defect-log.md` (**0064**). Subject to the **0053** drift audit once accepted.

## Pros and Cons of the Options

### Faithful three-layer port + `@theme inline` bridge (chosen)

* Good, because it lands the brand with zero fabricated values and keeps components working.
* Good, because it reuses the proven 0058 generate→drift-check loop and the existing bridge shape.
* Neutral, because the literal (non-aliased) semantic layer defers 0025's primitive-aliasing ideal.
* Bad, because the component-token layer and dark-only tokens enlarge the generated surface.

### Normalized, primitive-aliased port

* Good, because it best honors 0025's "semantic aliases primitive" two-layer ideal.
* Bad, because mapping ~500 literals back to primitives is large, manual, and hallucination-prone;
  it forks the canonical export and symmetrizing light/dark requires inventing values (**0063/0064**).

### Keep 0025 as-is (reference only)

* Good, because it changes nothing and adds no tokens.
* Bad, because it discards the actual brand system and leaves the project on a placeholder theme;
  the hand-picked subset re-introduces exactly the drift between Figma and code 0025/0058 prevent.

## More Information

Extends **0024** (CSS-first `@theme`) and supersedes **0025** (the token model it restates with a
third component-token layer and literal values). The codegen and lint gate are **0058**; the
generate→drift loop mirrors **0012** (`gen:types`). Recorded export defects feed the Defect Log
(**0064**) and a future light/dark token-parity Stage-1 check (**0064**/**0053**). The dark
selector convergence on `.dark` matches the **0058** agent rules; **0025** had already permitted a
class *or* `data-` attribute. The bridge is a temporary compatibility layer — native
re-tokenization of the components to Guile tokens, and the optional primitive-aliasing refinement,
are follow-up work. Drafted `proposed`; acceptance and the supersede link-flip are the human gate
(**0045** / `adr.py accept`, `adr.py supersede`).
