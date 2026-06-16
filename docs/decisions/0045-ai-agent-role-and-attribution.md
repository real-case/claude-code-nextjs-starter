---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# AI agent role: primary implementer with enumerated human-only gates and mandatory attribution

## Context and Problem Statement

The corpus is built around agentic development — **0001** names "agentic coding efficiency"
as a founding driver, **0003** and **0012** justify strictness by "an AI agent writes much
of the code", and **CON-003**/**0042** equip the agent with a mandated MCP toolchain. Yet
the rules governing the agent *itself* are scattered crumbs: **0001** says an agent never
sets `accepted`, **0042** bounds the toolchain's trust surface, and `CLAUDE.md` carries
process prose. No single record answers: what may the agent do autonomously, which actions
are reserved to humans, and how is agent-authored work attributed for audit? Without that
record, the boundary is re-derived per conversation — exactly the re-litigation **0001**
exists to prevent.

## Decision Drivers

* **One citable boundary** — the agent (and humans) need a stable "per ADR-0045" reference
  for what is and is not agent territory, consistent with the corpus's agent-legibility
  principle (**0002**).
* **Auditable provenance** — who or what authored each change must be reconstructable from
  history, matching the auditability the corpus demands everywhere else (**0001**).
* **Safety of irreversible and outward-facing actions** — production state, repository
  settings, secrets, and accepted decisions must not change without a human in the loop.
* **Agent throughput** — gates that do not protect something irreversible are friction; the
  human-only list must stay short and justified.

## Considered Options

* A single governing ADR: agent as primary implementer, an enumerated human-only gate list,
  and mandatory commit/PR attribution
* No explicit policy — conventions accrete per-record and in mutable `CLAUDE.md` prose
* Maximal gating — a human approves every agent action (pair-programming mode)

## Decision Outcome

Chosen option: "single governing ADR with enumerated gates and attribution", because it
makes the boundary durable and citable instead of implicit, while keeping the gate list
short enough not to strangle the agent throughput the corpus is designed for. The agent is
the **primary implementer**: it writes application code, tests, stories, migrations,
configuration, documentation, and *drafts* of ADRs. The following actions are
**human-only**:

1. Setting an ADR's status to `accepted` (restates **0001**).
2. Repository and branch-protection settings (**0008** already notes these are
   human-configured).
3. Production promotion and rollback decisions on the hosting platform (**0007**).
4. Provisioning, rotating, or revealing secrets (**0020**, **0042**).
5. Changing the constraint registry (`constraints.md`) — constraints are external mandates
   by definition.
6. Merging to the integration and production branches (**0029**) — merge follows the
   review policy in **0046**.

**Attribution is mandatory**: every agent-authored commit carries a `Co-Authored-By`
trailer identifying the agent, and agent-created PRs are labeled as agent-authored, so
provenance is queryable from history alone.

### Consequences

* Good, because the agent's authority is one referenceable record, not folklore — new
  contributors and new agent sessions inherit the same boundary.
* Good, because provenance trailers and PR labels make "what did the agent write?"
  answerable mechanically, which later records (review **0046**, triage **0048**) build on.
* Good, because the human-only list protects exactly the irreversible surfaces and nothing
  else, preserving throughput.
* Bad, because the gate list must be maintained as tooling evolves — a new irreversible
  surface (e.g. a payments provider) needs this record superseded or extended via a new ADR.
* Bad, because attribution is an authoring discipline; it requires a mechanical check (see
  Confirmation) to avoid silent erosion.

### Confirmation

`CLAUDE.md` (post `adr-sync-claude-md`) lists the human-only gates; sampled agent commits
in history carry the `Co-Authored-By` trailer; agent-created PRs carry the agent label; a
lightweight CI or hook check can flag agent-session commits missing the trailer. Repository
settings changes appear only in the audit log under human identities.

## Pros and Cons of the Options

### Single governing ADR with enumerated gates and attribution (chosen)

* Good, because it is durable, citable, and auditable — the corpus's own standard applied
  to the agent itself.
* Good, because the enumerated list is reviewable: each gate must justify itself against
  the throughput driver.
* Neutral, because the list will need extension as the project grows — but extension via
  ADR is the normal process.
* Bad, because it is one more record to keep consistent with reality.

### No explicit policy

* Good, because zero authoring cost now.
* Bad, because the boundary lives in mutable prose and per-session judgment — the exact
  failure mode (re-litigation, silent contradiction) that **0001** documents.
* Bad, because attribution stays optional, so provenance degrades silently.

### Maximal gating — human approves every agent action

* Good, because nothing irreversible can ever happen un-reviewed.
* Bad, because it discards the agent-throughput premise of the whole corpus (**0001**,
  **0003**) — the human becomes a full-time approval bottleneck for reversible,
  CI-protected work.
* Bad, because indiscriminate gates train rubber-stamping, weakening the few gates that
  matter.

## More Information

This is the governance keystone for the AI-process records that follow: review of
agent-authored PRs (**0046**), the advisory AI review check (**0047**), CI triage
(**0048**), and the drift audit (**0053**) all assume the role and attribution defined
here. Builds on **0001** (acceptance gate), **0007**/**0008** (deploy and repo-settings
ownership), **0020**/**0042** (secret fence and toolchain trust), **0029** (branch model).
Revisit via superseding record when a new irreversible surface appears or if attribution
tooling changes materially.
