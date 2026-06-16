---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Component story coverage policy: every component has stories for its meaningful states

## Context and Problem Statement

**0040** made the line-coverage *number* well-defined across the two Vitest projects, but line
coverage is silent about *state* coverage: a component can reach the **0031** threshold from a
single default render while its error, loading, empty, disabled, and variant states are never
instantiated. The testing modalities — interaction (**0037**), accessibility (**0038**), and
snapshots (**0039**) — only run over the stories that *exist*. So "comprehensive component
testing" ultimately depends on *which stories must exist*. The modalities and the measurement
are in place; what is missing is the **breadth mandate**. This record sets it.

## Decision Drivers

* **State completeness** — every meaningful state of every component should be rendered, so the
  modalities (**0037**/**0038**/**0039**) actually exercise it and it counts in coverage
  (**0040**).
* **Auditability** — "complete" must be checkable in review, not a matter of taste.
* **Scope clarity** — the mandate must say which components are in scope (reusable UI) and which
  are not (one-off page internals).
* **Meaningful, not mechanical** — the policy should require *meaningful* states, not a fixed
  arbitrary count and not every prop permutation (combinatorial explosion).

## Considered Options

* Mandate stories covering each component's **meaningful states** for every exported UI
  component, enforced by a CI existence check plus a review checklist
* Mandate **at least one** story per component (existence only)
* No policy — rely on the ≥80% line gate (**0040**/**0031**) alone

## Decision Outcome

Chosen option: "mandate stories for each component's meaningful states", because it turns
completeness into a defined, reviewable property rather than a side effect of a line number.
Every exported, reusable UI component (`src/components/**`, including the shadcn layer
**0026**) must have CSF 3 stories (**0035**) covering its **meaningful states**, enumerated
against the component's prop surface:

* **default**, plus each visual **variant / size**;
* **interactive states** — disabled, loading, and focus/active where they render differently;
* **data-edge states** — empty, error, and long-content / overflow / truncation;
* **theme and locale axes** — dark mode (**0024**/**0025**) and RTL / localized content
  (**0027**) where the component renders differently.

"Meaningful" is judged **in review** against the prop surface — it is **not** a fixed count, and
**not** every prop combination (combinatorial coverage is explicitly out of scope). These
stories are the fixtures the modalities run on (**0037** interaction, **0038** a11y, **0039**
snapshot), and their execution feeds the merged coverage gate (**0040**/**0031**).
**Enforcement is two-layered**: a CI check asserts that every exported component in
`src/components/**` has a colocated `*.stories.tsx` (existence is mechanically lintable); the
*completeness of states* is verified by PR review against the enumerated checklist above
(state completeness is a judgment a linter cannot make). **Page-level one-off compositions are
out of scope** — they are covered end-to-end (**0006**), not in the component catalogue.

### Consequences

* Good, because completeness becomes a defined, auditable property: every component's real
  states are rendered, so they are interaction-tested, a11y-checked, snapshotted, and counted —
  closing the gap line coverage leaves open.
* Good, because it reuses everything already decided (**0035**, **0037**–**0040**) and adds only
  a lightweight existence check, no new test tooling.
* Good, because scoping to *meaningful* states (not prop permutations) keeps the mandate
  achievable instead of combinatorially impossible.
* Bad, because enumerating states for every component is real authoring effort and can feel
  heavy for trivial components.
* Bad, because "meaningful states" is a judgment call: the CI check only guarantees a story
  *exists*, so state completeness rests on reviewer discipline, leaving residual subjectivity.

### Confirmation

A CI check (**0008**) asserts each exported `src/components/**` component has a colocated
`*.stories.tsx`; PR review applies the meaningful-states checklist above; stories cover the
enumerated variant/interactive/data-edge/theme-locale axes where applicable; the modalities
(**0037**/**0038**/**0039**) run over them and their coverage merges into the **0040**/**0031**
gate. Combinatorial prop coverage is explicitly not required; page-level compositions are
excluded and tested via e2e (**0006**).

## Pros and Cons of the Options

### Meaningful-states mandate, existence-check + review (chosen)

* Good, because it makes state completeness defined and auditable, feeding all the modalities
  and the coverage gate.
* Good, because it reuses the existing stack and adds only an existence lint.
* Neutral, because state completeness remains a review judgment, not a fully mechanical gate.
* Bad, because it is the most authoring effort of the three options.

### At least one story per component (existence only)

* Good, because it is fully mechanical and trivial to enforce.
* Bad, because one story typically renders one state; the error/loading/empty/variant states —
  exactly where bugs hide — can all go unrendered, so it does not deliver completeness.

### No policy, rely on the line gate

* Good, because it adds zero process.
* Bad, because the ≥80% line gate (**0040**/**0031**) is satisfiable without ever rendering a
  component's non-default states, so the breadth the whole Storybook testing set was built for
  is never guaranteed.

## More Information

This is the capstone of the Storybook testing set (**0034**–**0041**): it mandates the stories
that the modalities (**0037**/**0038**/**0039**) consume and that the measurement (**0040**,
gating **0031**) counts. Builds on **0026** (the component layer in scope), **0035** (CSF 3
stories), **0024**/**0025** (the theme axis), and **0027** (the locale/RTL axis); the
page-level boundary is **0006** (e2e). The existence check runs in CI (**0008**). Revisit if a
tool emerges that can measure *state* coverage mechanically, which could promote the review
checklist into an automated gate.
