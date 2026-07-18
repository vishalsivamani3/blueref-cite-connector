# Back-test candidates (worksheet — not the back-test)

Claude-drafted candidate citations for the pre-AI back-test. Each is
`provenance: "synthetic"` and **awaits human verification**. Run them through the
engine to see where the module and the drafted expectation agree or diverge:

```bash
npm run candidates
```

This is a **worksheet**, not the held-out back-test. The real back-test lives in
`../corpus/backtest/` and contains only human-`hand-verified` entries (PRD §12).
Workflow:

1. `npm run candidates` — see MATCH / DIVERGE / REFUSED per candidate.
2. A human verifies each citation against its `source` and The Indigo Book.
3. Verified-correct citations are moved into `../corpus/backtest/` with
   `provenance: "hand-verified"` and a `source` (they then run under
   `npm test -- --backtest`).

`MATCH` means the module is self-consistent with the draft — it does **not** mean
either is correct; the shared assumption still needs verification.

## Findings from the first run (2026-07)

16 candidates deliberately stressed conventions the synthetic dev corpus never
covered. Result: **6 real gaps** that the 100%-passing dev corpus had hidden —
which is exactly why the held-out track exists.

### Fixed (back-test → fix loop demonstrated)

| ID | Probe | Code | Fix |
|---|---|---|---|
| c0011 | `Department`/`Social`/`Services` not abbreviated | `ABBREV` (false negative) | Grew the verified T6 word subset in `cases.ts`; added regression seed (Monell). |
| c0012 | `Commissioner` → `Comm'r` | `ABBREV` (false negative) | Same; added regression seed (Duberstein). |
| c0013 | `Wis.` flagged as unknown court | `DATE_COURT` (**spurious flag** — worst failure mode, §11) | Added state high courts to `courts.json` (data, not code); added regression seed (Vosburg). |

After the fix: dev corpus `case 388/388 = 100%`, candidates `13 MATCH / 0 DIVERGE / 3 REFUSED`.

### Fixed: c0014, via direct extraction of Indigo tables T1/T3 (2026-07-18)

The reporter/court tables were expanded by extracting **Tables T1 (Federal
Materials) and T3 (U.S. States and Other Jurisdictions)** directly from the CC0
Indigo Book 2.0 PDF: **reporters 29 → 303**, **courts 67 → 172**. Existing entries
and their hand-curated `variants` were preserved.

Two things this surfaced:

1. **The draft was wrong, not the module.** c0014 originally used the bare court
   abbreviation `App. Div.`. Indigo T3 (New York) shows the correct form is
   **`N.Y. App. Div.`** — so the module was right to reject it. The candidate has
   been corrected against the source. A good illustration of why the held-out
   track verifies *both* sides.
2. **Spacing had to become generic.** Reporter spacing errors previously only
   worked for reporters with a hand-listed variant. With 274 new reporters, the
   checker now derives misspacings generically (a whitespace-insensitive index
   plus generated parse tokens), so `470 N.Y.S. 2d 987` is recognized and
   corrected to `N.Y.S.2d` rather than failing to parse.

Regression seeds added (`N.Y.S.2d` + `N.Y. App. Div.`, `A.D.2d`, `F.4th`). State
reporter entries now cite **T3**; federal stay **T1**. After: dev case slice
`474/474 = 100%`, candidates `14 MATCH / 0 DIVERGE / 2 REFUSED`.

### Fixed: c0016 — the silent mis-parse (2026-07-18)

The most dangerous finding, because it presented as a *success*. The parser
anchors the citation core at the END of the input, so anything it could not
account for was absorbed into the case name. A subsequent-history or string cite
then reassembled to the identical string and reported **`pass: true` with zero
violations** — a confident green light on a citation it had structurally misread:

```
"Grutter v. Bollinger, 288 F.3d 732, 740 (6th Cir. 2002), aff'd, 539 U.S. 306 (2003)"
  before →  pass: true, no violations
            parsed case name: "Grutter v. Bollinger, 288 F.3d 732, 740 (6th Cir. 2002), aff'd"
  after  →  pass: false, PARSE_FAIL ("subsequent history … check the primary citation on its own")
```

That is precisely the "silent wrongness is worse than no tool" risk (PRD §11.1)
and the "refuse loudly, never guess" rule (§6.5). The parser now validates that
nothing was left over — rejecting leftover history phrases (`aff'd`, `cert.
denied`, `rev'd`, …), a second reporter core, or an unconsumed year parenthetical
— and refuses instead of guessing. Note this is a **refusal, not support**:
subsequent-history citations are valid, and modelling them properly is future work.

Locked in by four **adversarial** corpus entries (PRD §7.3's 15% bucket), a new
generator bucket for inputs stated outright with their expected outcome. Dev case
slice `478/478 = 100%`.

### Fixed: c0010 — nominative reporters (2026-07-18)

Pre-1875 U.S. Reports carry the nominative volume and reporter parenthetically
between the official reporter and the first page (Indigo **T1.1**):

```
Marbury v. Madison, 5 U.S. (1 Cranch) 137, 177 (1803)
```

The seven nominatives are taken verbatim from T1.1 — `Wall.` (Wallace), `Black`,
`How.` (Howard), `Pet.` (Peters), `Wheat.` (Wheaton), `Cranch`, `Dall.` (Dallas) —
and live in a `nominatives` table in `reporters.json`. The citation core now
accepts an optional `(<vol> <nominative>)` group, which is parsed, validated, and
preserved through correction, so errors elsewhere in the cite are still caught:

```
"Marbury v. Madison, 5 U.S. (1 Cranch) 137, at 177 (1803)"
  → PINCITE; corrected to "…5 U.S. (1 Cranch) 137, 177 (1803)"
```

An *unknown* nominative still fails to parse rather than being guessed at.
Seven nominative seeds added (Marbury, McCulloch, Gibbons, Martin, Dred Scott,
Ex parte Milligan, Chisholm).

**Dev case slice `504/504 = 100%` — past the 500-entry Phase 1 release target.**
Candidates: `15 MATCH / 0 DIVERGE / 1 REFUSED` (only case short forms remain,
which are Phase 3).

### Fixed: c0015 — short forms (2026-07-18)

A `shortforms` rule module now covers the two short forms that attach to cases,
grounded in **Indigo R15**:

- **`id.`** (R15.3) — `*Id.*`, `*Id.* at 1200`. Checks italics (R2.1), the period,
  `Ibid.` → `Id.`, and the required `at` before a pincite (R15.3.2).
- **case short cites** (R15.2.2) — `*Fenton*, 233 N.E.2d at 219`. Per R15.2.2 the
  case name is italicized **but the comma after it is not**, the `v.` and second
  party are dropped, the first page is omitted, and the pincite takes `at`.

The draft was wrong again, in the same instructive way as c0014: c0015 originally
expected a **roman** short-form case name. R15.2.2/R2.1 require it *italicized* in
short citations, so the corrected expectation is `*Brown*, 347 U.S. at 495`.

**R15.2.3 is respected rather than guessed at.** When the first party is a
governmental or geographical unit (`United States v. Carmel`), the correct short
form uses the *other* party — a judgment call we will not fabricate. The module
flags `ORDERING` and leaves the citation uncorrected, pinned by an adversarial
corpus entry.

**Scope is format only.** Whether an `id.` refers to the right authority is a
*context* question (R15.3.3 forbids `id.` after a string cite or an ambiguous
reference) and needs the ordered preceding footnotes. That is Phase 3
(`check_document`); `SHORTFORM_CONTEXT` stays reserved for it, and
`list_supported` states plainly that a format pass is not a contextual guarantee.
`supra` is likewise deferred — it attaches mostly to books/periodicals, which have
no module yet.

Short-form slice `73/73 = 100%`, with its own 99.5% CI floor.
**Candidates: `16 MATCH / 0 DIVERGE / 0 REFUSED` — every finding closed.**

### Open (triaged, not yet fixed)

| ID | Probe | Code | Disposition |
|---|---|---|---|
| ~~c0010~~ | ~~Nominative reporter `5 U.S. (1 Cranch) 137`~~ | ~~`PARSE_FAIL`~~ | **FIXED 2026-07-18** — see below. |
| ~~c0014~~ | ~~`N.Y.S.2d` reporter + `App. Div.` court~~ | ~~`PARSE_FAIL`~~ | **FIXED 2026-07-18** — see below. |
| ~~c0015~~ | ~~Case short form `Brown, 347 U.S. at 495`~~ | ~~`SHORTFORM_CONTEXT`~~ | **FIXED 2026-07-18** — see below. |
| ~~c0016~~ | ~~Subsequent history (multiple parentheticals)~~ | ~~parse structure~~ | **FIXED 2026-07-18** — see below. |

### Flagged for human review (do not silently resolve, §12)

- The dev seed `Brown v. Board of Education` is likely **non-canonical**: a formal
  cite abbreviates it `Brown v. Bd. of Educ.` (T6 `Board` → `Bd.`, `Education` →
  `Educ.`). `Board`/`Education` were deliberately **left out** of the checker's T6
  subset so as not to spuriously flag this seed. A human should confirm the
  canonical form; if it is `Bd. of Educ.`, fix the seed and add both words to the
  table together.
