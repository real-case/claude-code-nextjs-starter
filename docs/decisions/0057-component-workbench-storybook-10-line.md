---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Component workbench version: adopt the Storybook 10 line (supersedes 0034)

## Context and Problem Statement

**0034** adopted Storybook on the Vite builder with stories doubling as tests via
`@storybook/addon-vitest`, and its More Information "targets the Storybook 9 line." When
Phase 10 came to install that workbench, the 9 line proved **incompatible with the test
toolchain the project already runs**: **0006** mandates Vitest (now `4.1.8`), which together
with `@vitejs/plugin-react@6` pulls in **Vite 8** — but `@storybook/nextjs-vite@9` peers only
Vite `^5 || ^6 || ^7`, so SB9 cannot be installed without either downgrading the test stack or
forcing unsupported peers. Storybook 10 is the line that added Vite 8 support
(`@storybook/nextjs-vite@10` peers `… || ^8`) while keeping the **same first-party packages and
architecture** 0034 chose. Because accepted ADRs are immutable (**0001**), retargeting the
version is recorded here as a superseding decision rather than an in-place edit — the mechanism
0034/0035 anticipated for version moves.

## Decision Drivers

* **Compatibility with the mandated test stack** — the workbench must run on the Vitest 4 /
  Vite 8 / React 19 toolchain already decided (**0006**), not force a downgrade of it.
* **Preserve the 0034 architecture** — Vite builder, stories-as-tests via `addon-vitest`,
  CSF 3 (**0035**), and the modalities (**0037**–**0041**) must carry over unchanged.
* **Honor ADR immutability (0001)** — a version change to an accepted record goes through a
  superseding ADR, not an edit.
* **Stay on a first-party, supported line** — the `addon-vitest` + `nextjs-vite` integration
  that is the heart of the phase must be a supported, non-forced install.

## Considered Options

* Adopt the **Storybook 10** line (10.4.x), superseding 0034's version target; keep the
  toolchain as-is
* Stay on **Storybook 9**, downgrading Vite to 7 and `@vitejs/plugin-react` to 5
* Stay on **Storybook 9**, force-installing against Vite 8 with `--legacy-peer-deps`

## Decision Outcome

Chosen option: "Adopt the Storybook 10 line", because it is the only option that runs the
workbench on the project's existing, ADR-mandated Vitest 4 / Vite 8 / React 19 stack without
downgrading core test tooling or forcing unsupported peer ranges. Storybook 10 keeps every
package and pattern 0034 chose — `@storybook/nextjs-vite` (Vite builder), `@storybook/addon-vitest`
(browser-mode stories-as-tests, peers Vitest 3/4), CSF 3 (**0035**), and the
interaction/a11y/snapshot/coverage modalities (**0037**–**0041**) — so the architecture in 0034
stands; only the targeted major moves from 9 to 10. The Phase-10 toolchain is pinned to the
10.4.x line: `storybook`, `@storybook/nextjs-vite`, `@storybook/addon-vitest`,
`@storybook/addon-a11y`, and `eslint-plugin-storybook` at `^10`, with `@storybook/test-runner`
at the release whose peer admits Storybook 10. This record **supersedes 0034**; the substantive
workbench rationale continues to live in 0034 (now superseded) and is not restated here — this
record changes only the version line and records why.

### Consequences

* Good, because the workbench installs cleanly on the current Vitest 4 / Vite 8 / React 19
  toolchain (**0006**) with no downgrade and no forced peers.
* Good, because the 0034 architecture (Vite builder, stories-as-tests, CSF 3, the modalities) is
  unchanged — this is a version realignment, not a redesign.
* Good, because it keeps the project on a current, first-party-supported Storybook line rather
  than a knowingly-behind major on a greenfield repo.
* Neutral, because the "Storybook 9 line" wording in **0035**–**0041** becomes historical: those
  records' decisions stand; only their version footnote is realigned, by this record, via 0034.
* Bad, because adopting a newer major than the one the corpus was written against means the
  Storybook/addon stack must be tracked on the 10 line — the **0056** dependency-update process
  owns that going forward.

### Confirmation

`package.json` pins the Storybook packages to the `^10` line; `npm install` resolves with no
`--legacy-peer-deps` / `--force`; `@storybook/nextjs-vite@10` peers Vite 8 and
`@storybook/addon-vitest@10` peers Vitest 4, matching the installed toolchain; the workbench,
browser-mode story tests, the a11y gate, and merged coverage (**0034**, **0036**, **0038**,
**0040**) run green in the CI gate (**0008**). After the human acceptance + link-flip,
`adr.py lint` shows 0034 as `superseded by ADR-0057` with the paired `supersedes ADR-0034` on
this record.

## Pros and Cons of the Options

### Adopt the Storybook 10 line (chosen)

* Good, because it is a drop-in on the installed Vitest 4 / Vite 8 / React 19 stack — no
  downgrade, no forced peers, supported by first-party peer ranges.
* Good, because it preserves the entire 0034/0035/0037–0041 architecture; the only change is the
  major version.
* Neutral, because it requires a superseding record and tracking the 10 line in **0056**.
* Bad, because the corpus prose still references the 9 line in places, so a reader must follow the
  0034 → 0057 supersede link to see the current target.

### Storybook 9 + downgrade Vite to 7

* Good, because it honors the 0034 "Storybook 9 line" wording verbatim with no superseding record.
* Bad, because it forces the build toolchain *below latest* on a greenfield repo: `vite@7` plus
  `@vitejs/plugin-react@5` (v6 peer-requires Vite 8), reopening churn the **0056** process would
  immediately want to undo.
* Bad, because it pins the test stack to satisfy a tool one major behind — the inversion of the
  "workbench rides the existing stack" driver in 0034.

### Storybook 9 + force peers

* Good, because it is the fastest path to *a* Storybook install.
* Bad, because `--legacy-peer-deps` installs SB9's `nextjs-vite` builder and browser-mode test
  integration against an unsupported Vite 8 — and that integration is the core of this phase, so
  silent breakage or flake would land exactly where it hurts most.
* Bad, because it leaves the dependency tree in a knowingly-inconsistent state that every later
  `npm install` and the **0056** triage must reason around.

## More Information

Supersedes **0034** (its status flips to `superseded by ADR-0057` via `adr-supersede` on
acceptance). It does **not** supersede **0035**–**0041**: their decisions (CSF 3, execution
engines, interaction, a11y, snapshots, coverage merge, the story-coverage policy) are
version-agnostic and remain accepted; their incidental "Storybook 9 line" references are
historical and realigned to the 10 line by this record. Builds on **0006** (the Vitest 4 stack
whose transitive Vite 8 dependency forces the version), **0001** (the supersede-don't-edit
discipline this record follows), and **0056** (the dependency-update process that now tracks the
Storybook 10 line). Acceptance and the paired supersede link-flip are the human gate (**0045**);
until then this record is `proposed` and 0034 remains `accepted`.
