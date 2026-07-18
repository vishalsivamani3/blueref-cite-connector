# Pre-AI back-test corpus (held-out, hand-verified)

This directory holds the **held-out validation set**: citations curated by a human
from published law-review footnotes that **predate generative AI**, cite-checked by
human journal editors. It exists to catch cases where the *synthetic* development
corpus (`tests/corpus/*.json`) encodes a hallucinated or wrong convention.

Run it separately:

```bash
npm test -- --backtest        # report accuracy on this set only
npm run test:ci -- --backtest # same, non-zero exit on schema problems
```

The normal `npm test` runs the synthetic development set and **never** touches this
directory, so the two tracks stay isolated (a train/test split against poisoning).

## Why "pre-AI"

Since ~2022, scraped or model-generated text can contain plausible-but-wrong
citation formats. If our ground truth were drawn from that, the tool could score
99.5% against a poisoned target and still be wrong. Citations published and
cite-checked **before** generative AI (roughly pre-2022; earlier is safer) were
produced by human editors under real citation conventions, so they are trustworthy
ground truth. Citations themselves are uncopyrightable facts (PRD §7.3) — copy the
citation, never the surrounding prose.

## Who populates this (humans only)

Per PRD §12, **Claude Code does not add `hand-verified` entries.** A human adds
them, having checked each against the published source and The Indigo Book. Claude
Code may draft *candidates* (marked `provenance: "synthetic"`) elsewhere for a human
to verify and promote here — but nothing lands in this directory unverified.

## Entry format

Same schema as the dev corpus (`../SCHEMA.md`), with two requirements:

- `provenance` must be `"hand-verified"`.
- `source` is **required**: where the citation was verified, including a pre-AI
  publication year, e.g. `"89 Harv. L. Rev. 1685, 1690 (1976), fn. 12"`.

Example (a human authors this after verifying the source):

```json
[
  {
    "id": "case-b0001",
    "type": "case",
    "mode": "check",
    "input": "Erie R.R. Co. v. Tompkins, 304 U.S. 64, 78 (1938)",
    "expected_violations": [],
    "expected_output": "Erie R.R. Co. v. Tompkins, 304 U.S. 64, 78 (1938)",
    "rules": ["IB R11", "IB T1", "IB R11.3.1"],
    "provenance": "hand-verified",
    "source": "verified against the U.S. Reports citation, pre-AI; used in <journal>, <year>, fn. <n>",
    "notes": "clean canonical, held-out"
  }
]
```

Put entries in `case.json`, `statute.json`, etc. in this directory. Give ids a
`b` prefix (`case-b0001`) so they never collide with the dev set.
