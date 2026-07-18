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

### Open (triaged, not yet fixed)

| ID | Probe | Code | Disposition |
|---|---|---|---|
| c0010 | Nominative reporter `5 U.S. (1 Cranch) 137` | `PARSE_FAIL` | Phase 1 hardening: parser must accept an optional nominative-reporter parenthetical. Affects pre-1875 U.S. Reports cites. |
| c0014 | `N.Y.S.2d` reporter + `App. Div.` court | `PARSE_FAIL` | Table completeness (§11.2): add state reporters and intermediate appellate courts. Long-tail data work, pinned by corpus entries as they arise. |
| c0015 | Case short form `Brown, 347 U.S. at 495` | `SHORTFORM_CONTEXT` | Phase 3 (short-forms module). Correctly refused (unsupported) rather than guessed. |
| c0016 | Subsequent history (multiple parentheticals) | `ORDERING` / parse structure | Latent: the parser treats everything before the last parenthetical as the case name, so a clean history cite round-trips (looks like a pass) but is mis-structured and would mishandle an error inside the history. Phase 1 hardening or a documented limitation. |

### Flagged for human review (do not silently resolve, §12)

- The dev seed `Brown v. Board of Education` is likely **non-canonical**: a formal
  cite abbreviates it `Brown v. Bd. of Educ.` (T6 `Board` → `Bd.`, `Education` →
  `Educ.`). `Board`/`Education` were deliberately **left out** of the checker's T6
  subset so as not to spuriously flag this seed. A human should confirm the
  canonical form; if it is `Bd. of Educ.`, fix the seed and add both words to the
  table together.
