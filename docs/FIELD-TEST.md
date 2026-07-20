# Field test — `check_document` end to end (PRD §10.5)

PRD §10.5 requires at least two real-world documents cite-checked end to end with
`check_document`, with **every discrepancy triaged** into either a corpus entry or a
documented limitation. This is that record.

## Corpus used

| Document | Ordered citation units | `id.` uses |
|---|---:|---:|
| SCOTUS merits brief (*Fischer*) | 92 | 13 |
| Second Circuit brief (*Volokh*) | 133 | 44 |
| SCOTUS petitioner brief | 115 | 40 |
| **Total** | **340** | **97** |

340 units exceeds the 200+ threshold. Each document was processed in page order with
the anti-TOA protocol (see `CAPTURING_REAL_CITATIONS.md`), and the source's italics
were restored from the PDF fonts so the run is faithful to what a user would submit.

### Why briefs rather than law review articles

PRD §9/§10.5 says "published law review articles". That language predates
**Amendment 1** (`PRD-AMENDMENTS.md`), which made practitioner/court-document format
the **default** style. Briefs are therefore the representative corpus for the tool as
it now ships, and they exercise `id.` chains far more heavily than an article does.

A law review article (70 Stan. L. Rev. 1) was attempted first and abandoned for a
mechanical reason worth recording: academic small-caps typesetting renders lowercase
letters as smaller capitals, so text extraction returns
`IDGEONOMEN IN THE CONOMY` for *Pidgeon, Women in the Economy*. Footnote ordering also
reconstructed poorly. This is an extraction limitation, not a tool limitation.

## Result

**325 of 340 units clean (95.6%).** Fifteen discrepancies, triaged below.

**Zero tool defects.** Every discrepancy is either a capture artifact, a source
deviation where BlueRef is correct, or a correct refusal.

## Triage

### 1. Capture artifacts — 11 (not tool defects)

Ten `TYPEFACE` flags and one `SHORTFORM_CONTEXT` flag trace to the extractor, not the
engine:

- **Leading prose in the case name.** `District of Columbia Circuit is reported at
  United States v. Fischer, 64 F.4th 329 …` — the unit regex swept up the preceding
  sentence, so the italic-span offset no longer lined up with the name.
- **Hyphenation across line breaks.** `Cir- cuit's lead opinion, United States v.
  Volpendesto …` — PDFs hyphenate at line ends and extraction preserves it.
- **`id.` with no antecedent in range.** The `Volokh` sequence opens on `*Id.*`
  because capture began mid-document; the antecedent sits in text that was never
  captured. The check is correct; the window was wrong.

Recorded as extraction limitations. No corpus entries added — they would encode
extractor bugs as citation rules.

### 2. Source deviates, BlueRef correct — 2

| As printed | Indigo R11.3.1 requires |
|---|---|
| `Bronx Household of Faith v. Board of Educ. of City of N.Y.` | `Bd. of Educ.` |
| `City & County of San Francisco v. EPA` | `Cnty.` |

The same published≠Indigo pattern seen throughout: elite briefs routinely spell out
party words the tables abbreviate. **Not** promoted to the corpus — encoding them as
correct would teach the checker to stop flagging a real error (PRD §12).

### 3. Correct refusals — 2

`Rule, 48 Fed. Reg. at 22` — the Federal Register is an explicit v1 non-goal (PRD §3).
BlueRef returns `unsupported` rather than checking it. This is the regulation guard
working on real material, and is exactly the behaviour §6.5 requires.

## What this validates

- `check_document` runs a full ordered citation sequence end to end.
- `id.` **context** validation (R15.3.3) operates across a real document: 97 `id.`
  uses produced exactly one flag, and that one was a capture-window artifact — i.e.
  no false positives on correct `id.` chains, which was the risk worth testing.
- The regulation refusal and the T6 abbreviation rules hold on unseen material.

## What it does not establish

The three briefs are practitioner-style federal appellate documents. The field test
says nothing about **academic** typeface at document scale, and little about statutes
or periodicals in sequence. The academic style remains the thinnest area of
validation — the back-test rests largely on a single law review article.
