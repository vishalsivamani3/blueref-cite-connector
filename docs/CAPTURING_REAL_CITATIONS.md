# Capturing real citations from published documents

How to turn a real, pre-AI published document into trustworthy back-test material.
This exists because the synthetic corpus can sit at 100% while real citations break
the engine — which is exactly what happened the first time we ran this.

## Why not just read the Table of Authorities

A Table of Authorities is an **index, not a source of canonical citations**.
Capturing from it produces four distinct classes of bad data:

1. **Trailing numbers are brief pages, not pincites.**
   `Smith v. Jones, 123 F.3d 456 (7th Cir. 1999) ...... 12, 15` — `12, 15` are the
   pages of the *brief* where the case is discussed. Captured naively they look
   exactly like a pincite and teach the corpus a wrong form.
2. **TOA typeface is unreliable.** Tables are often typeset differently from the
   argument text. The body text is the authoritative typeface signal.
3. **TOA entries are frequently truncated** — court or year parenthetical dropped,
   names shortened. Those are not canonical full cites.
4. **A TOA contains no short forms.** `id.` and short cites are a body-text
   phenomenon, so a TOA exercises none of that code.

## The protocol

Implemented in the capture script; each guard maps to a failure above.

| Guard | Rule |
|---|---|
| 1 | **Detect and skip TOA/TOC pages entirely** — by heading text (`TABLE OF AUTHORITIES`, `TABLE OF CONTENTS`, …) or a density of ≥5 dot-leaders on the page. Body text only. |
| 2 | **Reject any candidate containing a dot-leader** (`....`) — a TOA fingerprint that survived page-level detection. |
| 3 | **Strip trailing page references** from the captured span. |
| 4 | **Structural completeness gate** — a capture must have name + volume + reporter + first page + a parenthetical containing a 4-digit year. Truncated entries are dropped, not repaired. |

Two further traps found in practice:

5. **Do not split case names on internal periods.** `Grutter v. Bollinger` and
   `Regents of the Univ. of Cal. v. Bakke` contain abbreviation periods that a naive
   "trim at sentence boundary" rule reads as sentence ends — silently truncating
   the name to `Bollinger` / `Bakke`. Guard with an abbreviation list (`v.`, `Univ.`,
   `Co.`, `Inc.`, `Mt.`, `St.`, initials, …).
6. **Strip leading citation signals.** `See`, `See, e.g.,`, `overruled by`, `quoting`
   belong to the citation *sentence*, not the citation.
7. **Cut at a closing quotation mark.** Briefs frequently place a citation directly
   after quoted material — `…place of public accommodation.” Camarillo v. Carrols
   Corp., 518 F.3d 153, 156 (2d Cir. 2008)`. Without a guard the quoted prose is
   captured as part of the case name. Cut everything through a trailing `."` / `.”`.
8. **Reject nested citations.** `Calcano, 36 F.4th at 74 (citing Kreisler v. Second
   Ave. Diner Corp., 731 F.3d 184, 187–88 (2d Cir. 2013))` contains a citation inside
   an explanatory parenthetical. Capture the outer cite or skip; never capture the
   unbalanced fragment.
9. **Reject names cut mid-phrase.** Non-greedy matching before ` v. ` takes the
   *shortest* viable name: `American Civil Liberties Union v. Clapper` is captured as
   `Union v. Clapper`. Guard by checking the character preceding the name in the
   source is not a letter.
10. **Strip leading function words.** A citation embedded in a sentence picks up the
    preposition or conjunction in front of it — `Under Russello v. United States, 464
    U.S. 16, 23 (1983)` yields a case name of `Under Russello`. Strip a leading
    `Under|In|See|But|And|Because|Here|Thus|While|Although|Since|When|If|Compare|
    Unlike|Following|Applying`.

11. **Strip leading footnote numbers.** Body text carries footnote markers that sit
    immediately before a citation — `25 case is readily distinguishable from Waco
    Independent School District v. Gibson, 22 S.W.3d …` — and the digits plus the
    trailing words of the previous sentence land in the case name.
12. **Subsection parentheses are not a year parenthetical.** Statutes are cited with
    subsections in parens (`Tex. Fam. Code § 261.001(4)(A)(ii)`). A capture (or a
    parser) that treats the last parenthetical as the date will mis-read the
    subsection. Require a 4-digit year or a publisher name before treating a
    parenthetical as the date.

> Traps 9, 10 and 11 are the dangerous ones: they do not fail loudly, they produce a
> **plausible-looking but wrong citation**. Writing one of those into the
> hand-verified corpus is worse than having no entry at all, because the gate then
> teaches the checker something false. Eyeball every entry before promoting.

## Recovering typeface

Plain text extraction destroys italics, and typeface is the highest-risk dimension
(the academic style is not derivable from the Indigo Book at all). It *can* be
recovered from the PDF's fonts:

- Use `pdfjs-dist` and call `page.getOperatorList()` **before** `getTextContent()` —
  fonts are only registered in `commonObjs` during rendering.
- Resolve each text item's `fontName` through `page.commonObjs.get(...)` to get the
  real PostScript name (`CrimsonText-Italic`, `Garamond-Italic`).
- Treat `/italic|oblique/i` as italic and emit the corpus `*italic*` markers.
- Note: `pdfjs-dist` ≥5 needs Node 22 (`buffer.transferToFixedLength`); pin **4.2.67**
  on Node 20.

**Check the document can carry typeface at all before trusting it.** A First Circuit
slip opinion is typeset in `CourierNewPSMT` with **no italic font** — it emphasizes
case names by *underlining*, which is a drawing operation invisible to text
extraction. Such a document is excellent for structural ground truth and **useless
for typeface**; mark it `typeface: unavailable` and exclude it from typeface
judgments rather than recording false negatives.

## Choosing documents

| Need | Source |
|---|---|
| Academic typeface (highest risk — not Indigo-derivable) | A law review article |
| Practitioner typeface | A brief/motion **in a font with an italic variant** |
| Structural ground truth (names, reporters, courts, years) | Any of the above, incl. Courier opinions |
| Short forms / `id.` runs | Body text only — never a TOA |

Pre-2022 throughout; older is safer. Citations are uncopyrightable facts (PRD §7.3) —
capture the citation, never the surrounding prose.

## What the first run found

74 citations from a law review article, a First Circuit opinion, and a motion.
Two real defects, both invisible to a 100%-passing synthetic corpus:

- **Pincite ranges** (`239-40`, `42-43`) failed to parse **at all** — 15 refusals.
- **Federal district courts** (`E.D. Va.`, `D.D.C.`, `W.D. Tex.`, `D.N.J.`) were
  missing from the court table, producing **spurious `DATE_COURT` flags** on valid
  citations — the worst failure mode.

After fixing both: 34/74 → **49/74**, and excluding the typeface-unrecoverable
opinion, only **3** divergences remained — one missing historical state court
(`Cal. Dist. Ct. App.`), and two where the **source** does not follow strict Bluebook
abbreviation (`University of California`, `Board of Education`) and BlueRef is right.

## Published ≠ strict Bluebook: do not promote deviations

A trusted, well-drafted source is still not a conformity oracle. Three citations in
these documents deviate from strict Indigo T6/R11.3.1:

| As published | Indigo R11.3.1 requires |
|---|---|
| `Regents of the University of California v. Bakke` (1st Cir.) | `Regents of the Univ. of Cal. v. Bakke` |
| `Mills v. Board of Education` (Stan. L. Rev.) | `Mills v. Bd. of Educ.` |
| `Alston v. School Board` (Stan. L. Rev.) | `Alston v. Sch. Bd.` |

This is not poor drafting — **courts routinely spell out party names in their own
opinions**, and law reviews carry house styles. But it means a capture must clear
*two* gates before becoming ground truth:

1. the **source** is trustworthy (provenance), and
2. the citation **agrees with the Indigo rule** (conformity).

Promote only citations that clear both. Encoding a deviation as `expected_output`
would teach the checker to stop flagging a real error — the same failure §12 forbids
("never weaken a test to make it pass"). Deviations are still useful, as evidence of
what real practice looks like, but they are recorded here, not in the corpus.

Of 74 captures, **49 cleared both gates** and were promoted to `hand-verified`.

It also **corroborated the academic typeface model**, which the Indigo Book explicitly
does not cover: 46 of 56 academic full-cite case names were roman, with italics
reserved for short forms (`Lochner`, `Anderson`), signals (`See`, `But see`), cross
references (`Id.`, `supra`), and article titles — exactly the model the engine implements.
