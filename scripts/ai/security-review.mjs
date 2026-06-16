#!/usr/bin/env node
// scripts/ai/security-review.mjs — ADR 0055 (security Layer 2, advisory). A diff-scoped
// AI pass against the repo's recorded security invariants. Layer 1 — the blocking
// gitleaks secret scan (ADR 0055) — stays a required check and runs independently; this
// layer adds judgment the scanner can't, and never blocks a merge.

import {
  requireKeyOrExitInert,
  adrGrounding,
  readAdrs,
  getDiff,
  advise,
  postPrComment,
} from "./lib.mjs";

requireKeyOrExitInert("ai-security-review");

const diff = getDiff();
if (!diff.trim()) {
  console.log("ai-security-review: empty diff — nothing to review.");
  process.exit(0);
}

// Pull the full text of the security-relevant ADRs for a sharper pass.
const securityAdrs = readAdrs(["0010", "0011", "0020", "0042", "0055"]);

const review = await advise({
  grounding: `${adrGrounding()}\n\n${securityAdrs}`,
  task:
    "Review this diff for security issues against the repo's recorded invariants and CITE the ADR: " +
    "the service-role/secret key never reaches the client and is confined to server-only contexts " +
    "(ADR 0010); RLS policies are present for user-facing data and run as auth.uid() (ADR 0011); " +
    "secrets are behind the server-only fence and never importable into client code (ADR 0020); " +
    "credentials are env-references, never literals (ADR 0042). Flag anything that weakens these, " +
    "plus the usual injection / authz / unsafe-deserialization classes. Layer-1 secret scanning is a " +
    "separate blocking gate — do not duplicate it. If the diff is clean, say so in one line.",
  payload: `\`\`\`diff\n${diff.slice(0, 180000)}\n\`\`\``,
});

const body = `### 🤖 Advisory security review — Layer 2 (ADR 0055; the blocking gitleaks scan is Layer 1)\n\n${review}`;
postPrComment(process.env.PR_NUMBER, body);
console.log("ai-security-review: advisory posted.");
