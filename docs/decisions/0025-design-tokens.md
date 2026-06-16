---
status: "superseded by ADR-0065"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Design tokens as CSS custom properties, mapped into the Tailwind theme

## Context and Problem Statement

The project commits to a theme driven by **design tokens** — the named, reusable design
decisions (color, spacing, radius, typography) that give the UI a single visual source of
truth. The questions are where those tokens live, how the styling layer (Tailwind, **0024**)
and the component layer (shadcn/ui, **0026**) consume them, and how theming (light/dark)
switches.

This sits between two decisions that depend on it: Tailwind's CSS-first `@theme`
configuration (**0024**) needs a source for theme values, and shadcn/ui components
(**0026**) need themeable values to style against. A weak token model — hard-coded colors,
or tokens defined in a place neither Tailwind nor runtime theming can reach — would
undermine both.

## Decision Drivers

* **Single source of truth** — one definition of the design scale, consumed by both Tailwind
  (**0024**) and components (**0026**).
* **Runtime theming** — light/dark (and future themes) must switch at runtime without a
  rebuild, which favors CSS custom properties.
* **Semantic layer** — components should reference intent (`--color-primary`,
  `--color-muted`) not raw primitives (`--blue-600`), so themes can remap meaning.
* **RSC-friendly** — theming must work as static CSS with no client runtime (**0024**).

## Considered Options

* Design tokens as CSS custom properties, mapped into Tailwind's `@theme`
* Tokens as a JavaScript/TypeScript object consumed at build time
* A Style Dictionary pipeline generating tokens for multiple platforms

## Decision Outcome

Chosen option: "CSS custom properties mapped into Tailwind's `@theme`", because CSS variables
are the natural fit for runtime theming (light/dark switch by overriding variables, no
rebuild), they live in CSS alongside Tailwind's CSS-first config (**0024**), and shadcn/ui
(**0026**) styles against them directly. Tokens are layered: a primitive scale (raw values)
and a **semantic** layer (`--color-primary`, `--color-background`, `--color-muted`, …) that
components reference. The semantic tokens are exposed to Tailwind via `@theme` so utilities
and components share one vocabulary. Light/dark is a set of semantic-variable overrides
toggled by a class or `data-` attribute on the root.

### Consequences

* Good, because runtime theme switching is a CSS-variable override — instant, no rebuild,
  no client JS for the styling itself.
* Good, because one semantic token set is the single source of truth for both Tailwind
  utilities (**0024**) and shadcn components (**0026**).
* Good, because the semantic layer lets themes remap meaning without touching component code.
* Bad, because the primitive/semantic two-layer model is more upfront design than hard-coding
  values, and demands naming discipline.
* Bad, because CSS variables are not type-checked, so a typo in a token name fails silently
  (mitigated by components referencing a known, documented set).

### Confirmation

Semantic token CSS variables are defined in the global stylesheet and mapped into `@theme`
(**0024**); light/dark overrides switch via a root class/`data-` attribute; components
(**0026**) reference semantic tokens, not raw hex values.

## Pros and Cons of the Options

### CSS custom properties + Tailwind @theme (chosen)

* Good, because CSS variables enable rebuild-free runtime theming and live with the CSS-first
  config.
* Good, because one semantic set serves both utilities and components.
* Bad, because token names are not type-checked, and the two-layer model needs discipline.

### Tokens as a JS/TS object

* Good, because values are typed and could be imported in code.
* Neutral, because they can be fed into Tailwind at build time.
* Bad, because runtime theme switching then needs JavaScript and re-renders, rather than a
  pure CSS-variable swap — heavier and at odds with the runtime-free styling of **0024**.

### Style Dictionary pipeline

* Good, because it generates tokens for many platforms (web, iOS, Android) from one source.
* Neutral, because it is a robust, scalable token system.
* Bad, because its multi-platform tooling is overkill for a single web app and adds a build
  pipeline with no payoff when CSS variables already cover web theming.

## More Information

Builds on **0024** (Tailwind CSS-first `@theme`, the consumer of these tokens). The component
layer that styles against the semantic tokens is **0026**. If the design system later needs
multi-platform token export, a superseding ADR could introduce a generation pipeline.
