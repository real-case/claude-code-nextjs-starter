---
status: "proposed"
date: 2026-06-15
decision-makers: Yurii Anichkin
consulted: AI implementer
informed: AI implementer
---

# Neutral token baseline for the starter template: a stock shadcn palette through the 0065 bridge (supersedes 0065)

## Context and Problem Statement

**0065** made a concrete **Guile** Figma variable export the project's token source of
truth: a faithful three-layer port — 171 raw primitives in `:root`, a spacing/radius/typography
scale, a 65-token semantic layer, and a 436-token component layer
(`--color-c-{component}-{part}[-state]`) — carried as literal values in `@theme`, with a
`@theme inline` shadcn compatibility bridge so the existing components keep their backing
tokens. That was the right call **for the Guile product**.

This repository is now being extracted into a **reusable starter template**: the ADRs, the
linters, the design-system governance gates, and the AI toolchain are kept, but the Guile demo
application — its booking/notes/auth screens, every component, and the brand it was built for —
is removed (see the template-extraction work that also zeroes `src/components/**`). The Guile
token export is **brand-specific design data for a product the template does not ship**: a
starter that arrives pre-painted in another product's barbershop palette is worse than one with
a neutral default a consumer immediately replaces.

The question this record settles: **what token set does the template ship so that it is
brand-neutral and demo-free, without forking the reusable token machinery 0065 established
(the `@theme inline` bridge and the 0058 single-source codegen) and without breaking the kept
governance gates (token lint, `gen:tokens` drift, build)?** Like **0065**, this does not change
the *mechanism* of **0024**/**0058** (CSS variables in `@theme`, runtime theming, generate-then-
drift-check) — it restates which *values* are canonical for a template that has no design export.

## Decision Drivers

* **Brand-neutral by default** — the template must carry no product-specific design data; a
  consumer wires their own design system, they do not inherit Guile's.
* **Zero fabricated design data** — the same anti-hallucination driver as **0065**/**0063**: do
  not invent a fake bespoke palette to look "designed". Use a well-known, a11y-sane stock set.
* **Keep the reusable machinery intact** — the `@theme inline` bridge, the **0058** `gen:tokens`
  single-source loop (CSS → typed union + lint allowlist + agent rules), and the shadcn names
  the kept governance assumes must all survive unchanged in mechanism.
* **Preserve, don't discard, 0065's architecture** — the layered Figma-export model (primitive →
  semantic → component, literal values, a bridge) is the documented target for when a consumer
  wires a real export; the template keeps the *shape* and swaps the *values*.
* **Green gates at zero components** — `check:tokens`, the `gen:tokens` drift gate, and `build`
  must stay green with the demo removed.

## Considered Options

* **Neutral shadcn baseline through the existing bridge** — replace the Guile primitive/semantic/
  component layers with the stock shadcn (Tailwind v4) value layer (`:root` + `.dark`), keep the
  spacing/radius/type scale, keep the `@theme inline` bridge aliasing the shadcn names onto it,
  regenerate the 0058 artifacts.
* **Keep the full Guile export** — ship the 0065 token set as the template's starting palette and
  let consumers re-export over it.
* **Strip tokens to nothing** — remove the color layers entirely and let the first component
  introduce tokens.

## Decision Outcome

Chosen option: **"Neutral shadcn baseline through the existing bridge"**, because it is the only
option that makes the template brand-neutral **and** demo-free while keeping the **0065** machinery
and the kept gates working with zero fabricated design data. Concretely:

* **`src/app/globals.css`** keeps the layered shape but swaps the values: a **value layer** of the
  stock shadcn semantic variables (`--background`, `--foreground`, `--primary`, `--muted`,
  `--destructive`, …) in `:root` with `.dark` overrides (neutral oklch, the canonical shadcn
  Tailwind-v4 set); the spacing/radius/typography scale unchanged in `@theme`; and the **same**
  `@theme inline` bridge aliasing the shadcn `--color-*` names onto the value layer. The Guile
  primitive scale, the 65 semantic tokens, and the 436 component tokens (`--color-c-*`,
  `--color-main-*`, `--color-booking-widget-*`, …) are **removed**.
* The **0058 codegen** (`scripts/gen-tokens.mjs`) is **unchanged**: it still unions token names
  across the `@theme`/`@theme inline` blocks and registers `.dark`-only color names. With the
  neutral set it simply emits a smaller registry (19 color tokens, no `--color-c-*`); the
  generate→prettier→CI-drift loop is identical.
* **0065's three-layer Figma-export architecture is retained as the documented target**, not
  discarded: when a consumer wires a real export, they reintroduce a primitive layer and the
  component-token layer and point the value layer at it (the bridge and `gen:tokens` stay put).
  That re-adoption is itself an ADR for the consuming project.

This record **supersedes 0065**. Per **0001**/**0045** the formal supersede link-flip (moving
**0065** to `superseded`) is performed at the human **acceptance** gate (`adr.py accept 0066`,
then `adr.py supersede --old 0065 --new 0066`); until then **0065** remains the in-force record
and **0066** is a proposal.

### Consequences

* Good, because the template ships no product-specific design data — a consumer starts from a
  neutral, a11y-sane default and replaces it with their own system, exactly the template's job.
* Good, because the reusable machinery is untouched: the `@theme inline` bridge, the **0058**
  single-source codegen, the shadcn names, and the kept governance gates all work unchanged.
* Good, because **0065**'s architecture is preserved as documentation, not deleted — the path back
  to a full Figma-export token system is a value swap, not a re-design.
* Good, because the neutral set is the canonical shadcn palette (no fabricated bespoke values),
  honoring the same anti-hallucination driver as **0065**/**0063**.
* Bad, because the primitive-layer and component-token-layer machinery (and the `gen:tokens`
  `.dark`-only-name capture path **0065** added) is now exercised only by a future export —
  partly vestigial until a consumer wires one.
* Bad, because a consumer who wants the Guile-style layered system must reintroduce that structure
  themselves; the template hands them the shape and the gates, not the values.

### Confirmation

`npm run gen:tokens` regenerates the three artifacts and leaves a clean `git status` (the CI drift
gate, **0058**/**0012**); the generated allowlist contains the neutral shadcn semantic tokens and
**no** `--color-c-*` / `--color-main-*` / `--color-booking-widget-*` token. Every `var(--…)`
referenced in the `@theme inline` bridge resolves to a variable declared in `globals.css` (a
structural check, no dangling references). `npm run typecheck`, `npm run lint`, `npm run
check:tokens`, `npm run build`, and `npm run test:coverage` pass, and `src/components/**` ships
zero components (the demo is removed). Subject to the **0053** drift audit once accepted.

## Pros and Cons of the Options

### Neutral shadcn baseline through the existing bridge (chosen)

* Good, because it is brand-neutral and demo-free with zero fabricated design data.
* Good, because it reuses **0065**'s bridge and the **0058** generate→drift loop unchanged — only
  the values move.
* Good, because **0065**'s layered architecture survives as the documented re-adoption target.
* Neutral, because the primitive/component layers become vestigial until a real export is wired.
* Bad, because a consumer wanting the layered system must reintroduce it.

### Keep the full Guile export

* Good, because it changes nothing and the gates stay green immediately.
* Bad, because it ships another product's brand as the template's default — the demo-removal goal
  is exactly to strip product-specific data; a consumer would have to delete it first anyway.

### Strip tokens to nothing

* Good, because it is the leanest possible starting point.
* Bad, because it breaks the shadcn bridge and `@layer base` (no `--color-background`/`-foreground`
  to resolve), leaves `gen:tokens` with an empty registry, and makes `check:tokens` police nothing
  — the kept governance would have no token set to enforce against.

## More Information

Supersedes **0065** (which superseded **0025** — the chain is 0025 → 0065 → 0066). Extends
**0024** (CSS-first `@theme`); the codegen and lint gate are **0058**; the generate→drift loop
mirrors **0012** (`gen:types`). The neutral value-layer + `@theme inline` bridge is the canonical
shadcn (Tailwind v4) structure, so the shadcn components (**0026**) bridge onto it unchanged. When
a project built from this template wires a real Figma export, it should follow **0065**'s
three-layer architecture (reintroduce primitives + component tokens, point the value layer at
them) and record that adoption in its own ADR. The figma MCP server stays read-only (**0044**);
design tokens remain code-canonical. Drafted `proposed`; acceptance and the supersede link-flip
are the human gate (**0045** / `adr.py accept`, `adr.py supersede`).
