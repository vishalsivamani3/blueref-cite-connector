# Corpus entry schema

This is the finalized Phase 0 corpus schema (PRD Section 7.4). Every corpus entry
is one test (PRD Section 7.2). The corpus only grows (PRD Section 7.6).

## Entry shape

```json
{
  "id": "case-0173",
  "type": "case",
  "mode": "check",
  "input": "Smith v. Jones, 123 F. 3d 456, 460 (7th Circuit 1999)",
  "expected_violations": ["SPACING", "DATE_COURT"],
  "expected_output": "Smith v. Jones, 123 F.3d 456, 460 (7th Cir. 1999)",
  "rules": ["IB R11.6.2", "IB R12.2"],
  "provenance": "synthetic",
  "notes": "spacing in F.3d; court abbreviation"
}
```

### Fields

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique, `"<type>-<4 digits>"`. |
| `type` | yes | One of `case`, `statute`, `periodical`, `book`, `shortform`. |
| `mode` | yes | `check` (input string → violations + corrected) or `format` (components → canonical string). |
| `input` | check | The citation string to check (may contain errors). |
| `components` | format | Structured fields for the formatter. |
| `expected_violations` | check | Exact set of error codes expected (order-insensitive). `[]` for a clean citation. |
| `expected_output` | yes | Exact expected canonical citation, with typeface markers (below). |
| `rules` | yes | Indigo Book rule reference(s) the entry exercises, e.g. `["IB R11.6.2", "IB R12.2"]`. |
| `provenance` | yes | `hand-verified` (human only) or `synthetic` (scripted/Claude). |
| `notes` | no | Free text. |

## Typeface markers (PRD Section 7.4)

Typography is encoded with lightweight markers so exact-match testing covers it:

- `*italic*` — italics (e.g. article titles, short-form case names, signals).
- `%small caps%` — large-and-small caps (e.g. book authors/titles, journal names).

Tools also return a plain-text variant with markers stripped.

## Error codes

Violations use **only** the failure taxonomy from PRD Section 7.5:

`PARSE_FAIL`, `TYPE_MISDETECT`, `ABBREV`, `TYPEFACE`, `ORDERING`, `PINCITE`,
`PUNCTUATION`, `SPACING`, `DATE_COURT`, `SHORTFORM_CONTEXT`, `SPURIOUS_FLAG`.

The harness validates that every `expected_violations` code is in this set and
rejects any other string, so the corpus cannot drift from the taxonomy.

### Two decisions flagged for human review

1. **Section 7.4 vs. Section 7.5 code names.** The PRD's §7.4 *example* uses
   `REPORTER_SPACING` and `COURT_ABBREV`, but the canonical taxonomy in §7.5 (the
   one CI reports per-code) uses `SPACING` and the court-bearing `DATE_COURT`.
   These two lists disagree. This corpus follows **§7.5** as the source of truth
   and maps the §7.4 example to `SPACING` + `DATE_COURT`. If §7.4's granular names
   were intended to be canonical instead, the taxonomy and `ErrorCode` enum need
   updating — flagged per PRD Section 12 (flag, don't silently resolve).

2. **`ABBREV` vs. `DATE_COURT` for court names.** Court-name abbreviation errors
   (`7th Circuit` → `7th Cir.`) are coded `DATE_COURT`, since `DATE_COURT` is the
   only taxonomy code covering the date/court parenthetical, and `ABBREV` is
   reserved for reporter/word/periodical/geographic table abbreviations. This is a
   deliberate, reviewable convention, documented here so corpus authors stay
   consistent.

3. **`PINCITE` coverage is a superfluous-`at`, not a dropped pincite.** A dropped
   pincite is *lossy* — the checker cannot reconstruct the page number, so
   `expected_output` would be unsatisfiable — and, more fundamentally, a missing
   pincite is not a pure format error (pincites are not always required; that
   depends on whether the author points to specific material, which is context,
   not format). So the `PINCITE` class is exercised by a reversible error instead:
   a superfluous `at` in a full-cite pincite (`456, 460` → `456, at 460`). "Missing
   required pincite" is left to the human-verified back-test and short-form work,
   where context is available. Flagged per PRD Section 12.

## Corpus tracks: dev vs. pre-AI back-test

To guard against a corpus poisoned by AI-hallucinated conventions, entries are
split by `provenance` into two tracks with different trust levels:

- **`synthetic` (development set).** Seeds + scripted mutations authored by Claude
  Code. Tests the engine's *internal consistency*. Regenerable via
  `npm run corpus:gen`. Lives in `tests/corpus/<type>.json`.
- **`hand-verified` (pre-AI back-test / held-out set).** Citations a human curates
  from **published law-review footnotes that predate generative AI** (roughly
  pre-2022), which were cite-checked by human editors. Tests the engine's
  *correctness against reality* — it catches cases where the synthetic ground
  truth itself encodes a wrong convention. Lives in `tests/corpus/backtest/`.
  Populated by humans only (PRD Section 12); each entry records its `source`.

Run the held-out back-test with `npm test -- --backtest` (see
`tests/corpus/backtest/README.md`). The dev set proves the module self-consistent;
the back-test proves it is not memorizing hallucinated formats.

## Provenance rule (PRD Section 12)

All entries generated by Claude Code (seeds and scripted mutations) are marked
`provenance: "synthetic"` and are **subject to human spot-check**. Only a human
adds `hand-verified` entries. Nothing in this corpus should be treated as
authority-verified until a human has reviewed it against the Indigo Book.
