// scripts/ai/lib.mjs
//
// Shared helpers for the Phase-12 ADVISORY AI jobs (ADRs 0048–0057). Every job is
// advisory (it never blocks a merge — ADR 0047/0048), ADR-grounded (it cites record
// numbers), and INERT until a 👤 provisions ANTHROPIC_API_KEY (ADR 0046/0044) — the
// same inert-until-token posture as the Chromatic token. With no key, each job no-ops
// cleanly (the workflow also gates on a has-key job, so the script never even runs).
//
// Uses the official Anthropic SDK (this is a Node/TS repo — ADR 0024), model
// claude-opus-4-8 with adaptive thinking. Grounding is CLAUDE.md + the decisions index
// as a CACHED, byte-stable system prefix (prompt caching: stable prefix, volatile diff
// last), so the model can cite ADR numbers without re-feeding all 64 records per run.

import Anthropic from "@anthropic-ai/sdk";
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

/** True only when a non-empty key is present (ADR 0046 — human-provisioned). */
export function hasKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Exit 0 with an inert note when no key — the double-guard beneath the workflow gate. */
export function requireKeyOrExitInert(job) {
  if (hasKey()) return true;
  console.log(
    `${job}: inert — no ANTHROPIC_API_KEY (👤-provisioned, ADR 0046/0044). ` +
      `Add it as a GitHub Actions secret to activate this advisory job.`,
  );
  process.exit(0);
}

/** The ADR grounding: CLAUDE.md (summarizes every record) + the decisions index. */
export function adrGrounding() {
  const parts = [];
  for (const p of ["CLAUDE.md", "docs/decisions/README.md"]) {
    if (existsSync(p))
      parts.push(`===== ${p} =====\n${readFileSync(p, "utf8")}`);
  }
  return parts.join("\n\n");
}

/** Read the full text of specific ADRs by number (e.g. for a targeted security pass). */
export function readAdrs(numbers) {
  const out = [];
  for (const n of numbers) {
    const id = String(n).padStart(4, "0");
    const match = execSync(`ls docs/decisions/${id}-*.md 2>/dev/null || true`, {
      encoding: "utf8",
    }).trim();
    if (match) out.push(`===== ${match} =====\n${readFileSync(match, "utf8")}`);
  }
  return out.join("\n\n");
}

/** Diff of the current branch against its base (PR base ref, or a provided range). */
export function getDiff() {
  const base = process.env.DIFF_BASE || process.env.GITHUB_BASE_REF;
  try {
    if (base) {
      execSync(`git fetch --no-tags --depth=1 origin ${base}`, {
        stdio: "ignore",
      });
      return execSync(`git diff --no-color origin/${base}...HEAD`, {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
    }
    return execSync(`git diff --no-color HEAD~1...HEAD`, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    console.error("could not compute diff:", err.message);
    return "";
  }
}

// Adaptive thinking + the `effort` parameter are only valid on these tiers. Haiku 4.5,
// Sonnet 4.5, and older models return a 400 on BOTH, so we send neither for them — which
// is also the cheaper, faster default someone picks Haiku for. Keep this list in sync
// with the claude-api reference (effort: Fable 5 / Opus 4.6–4.8 / Sonnet 4.6; adaptive
// thinking: same set).
const SUPPORTS_ADAPTIVE_EFFORT = /^claude-(fable-5|opus-4-[678]|sonnet-4-6)/;

/** The thinking/effort params the chosen model accepts (empty for Haiku/older). */
function modelParams(model) {
  if (!SUPPORTS_ADAPTIVE_EFFORT.test(model)) return {}; // e.g. claude-haiku-4-5
  return {
    thinking: { type: "adaptive" },
    output_config: { effort: process.env.ANTHROPIC_EFFORT || "high" },
  };
}

/**
 * Run one advisory turn. Grounding is a CACHED system block (ADR-stable prefix);
 * `task` + `payload` are the volatile user turn. Streams (per the API guidance for
 * larger outputs) and returns the final text. The thinking/effort knobs are sent only
 * to models that support them (so `ANTHROPIC_MODEL=claude-haiku-4-5` just works).
 */
export async function advise({ grounding, task, payload }) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    ...modelParams(MODEL),
    system: [
      {
        type: "text",
        text:
          "You are an ADVISORY reviewer for this repository. Your output is a suggestion, " +
          "never a gate (ADR 0047/0048): a human always decides. Ground every point in the " +
          "project's accepted ADRs and CITE the record number(s) you rely on (e.g. “ADR 0058”). " +
          "Be concise, specific, and actionable; prefer a short bulleted list over prose. If you " +
          "find nothing worth raising, say so in one line rather than inventing findings.",
      },
      {
        type: "text",
        text: `Project decision context (ADR corpus summary):\n\n${grounding}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: `${task}\n\n${payload}` }],
  });
  const message = await stream.finalMessage();
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Post a comment on a PR via the gh CLI (advisory — no required-check status). */
export function postPrComment(prNumber, body) {
  if (!prNumber) {
    console.log("(no PR number — printing advisory below)\n");
    console.log(body);
    return;
  }
  execSync(`gh pr comment ${prNumber} --body-file -`, {
    input: body,
    stdio: ["pipe", "inherit", "inherit"],
  });
}
