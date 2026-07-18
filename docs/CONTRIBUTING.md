# Contributing to BlueRef

Thanks for helping make legal citation checking deterministic and testable.

## Principles (non-negotiable)

1. **The engine is deterministic.** No LLM calls anywhere in the parse/check/
   format path (PRD §6.2). The whole value proposition is that BlueRef does not
   hallucinate.
2. **Rules derive from The Indigo Book (CC0)**, never from The Bluebook. Cite
   Indigo Book rule numbers (e.g. `IB R11`, `IB R12.2`) in code comments and in
   every corpus entry. Do not put the word "Bluebook" in package/repo/tool names.
3. **Never weaken a test to make it pass.** If you believe an expected output is
   wrong, open an issue with the Indigo Book rule reference and flag it for human
   review — do not edit the corpus to match the code (PRD §12).
4. **The corpus only grows.** Every bug becomes a corpus entry before its fix
   merges (PRD §7.6).
5. **Refuse loudly, never guess.** Unsupported input returns
   `confidence: "unsupported"`, not a best-effort string (PRD §6.5).

## Setup

```bash
npm install
npm run corpus:gen && npm test   # sanity check
```

Node 20+ required.

## Project layout

```
src/engine/types.ts       shared interfaces (the RuleModule contract)
src/engine/registry.ts    module registry + detection dispatch
src/engine/rules/*        one file per citation type (added Phases 1-3)
src/data/*.json           abbreviation tables (data, not code)
tests/seeds.ts            clean canonical citations
tests/mutators.ts         deterministic error-injection operators
tests/generate.ts         builds the corpus from seeds + mutators
tests/harness.ts          runs the corpus, reports accuracy, enforces the gate
tests/corpus/*.json       the golden corpus (committed, regenerable)
tests/smoke.ts            end-to-end MCP server test
```

## Before you open a PR

CI runs all of these; run them locally first:

```bash
npm run typecheck
npm run lint
npm run corpus:gen        # must produce no git diff — the corpus is reproducible
npm run test:ci           # must stay at/above the current phase floor
npm run smoke
```

## Error codes

Use only the §7.5 failure taxonomy (see `src/engine/types.ts` and
`tests/corpus/SCHEMA.md`). The harness rejects any code outside it.

## Adding a citation type

See [ADDING_A_CITATION_TYPE.md](ADDING_A_CITATION_TYPE.md). A new type is one
`RuleModule` file + data tables + a ≥100-entry corpus slice at 99.5%, in one PR.

## Reporting a bug

Use the **bug report** issue template. A complete report is a ready-made corpus
entry: the failing input, the expected output, the expected violation codes, and
the Indigo Book rule reference.
