# PRD amendments

The PRD (v1.0) remains the source of truth. This file records the **only**
amendment made to it. Everything else in the PRD stands unchanged.

---

## Amendment 1 — Bluepages / practitioner format is in scope for v1

**Authorized by:** project owner, 2026-07-18.
**Amends:** PRD §3 (Non-goals) and §11.4 (Risk: scope creep toward Bluepages).
**Scope:** this element only. No other part of the PRD is altered.

### What the PRD said

- §3 Non-goals (v1): *"Bluepages / court-document formatting (v2 candidate)"*
- §11.4 Risk: *"Scope creep toward Bluepages. Answer is no until v2."*

### What it now says

Practitioner (court-document) format is **in scope for v1 and is the default
style**. Academic (law-review) format remains supported as a secondary style.

### Why — the copyright constraint drives this

This is not scope creep; it follows directly from PRD §4.1, which is
non-negotiable and requires all rules and tables to derive from **The Indigo
Book (CC0)** rather than any copyrighted citation manual.

1. **The Indigo Book specifies the practitioner convention.** R2.1 gives the
   italicization rules for standard legal documents, and R1.2 states that *"a full
   treatment of formal citation formats for law review articles is outside the
   scope of The Indigo Book."* Practitioner format is therefore the only style
   fully derivable from our permitted source.

2. **Academic styling cannot be sourced without a copyright problem.** The
   detailed academic conventions live in copyrighted manuals — The Bluebook, and
   for academic work at some institutions the Maroonbook (University of Chicago
   Manual of Legal Citation). §4.1 bars ingesting them. There is no CC0
   equivalent that covers academic typeface in full.

3. **So an academic-only v1 would be the weaker product**, and weaker precisely
   because of the copyright limitation rather than any design choice. Academic
   efficacy is capped by that constraint no matter what we do; practitioner
   support is not.

### Consequences already implemented

- `DEFAULT_STYLE = 'practitioner'` (`src/engine/types.ts`).
- Every rule module takes a `style` parameter; `check_citation`,
  `format_citation` and `check_document` expose it.
- Academic remains available and is **honestly labelled**: `list_supported`
  states that academic typeface is not derivable from the CC0 source and is
  treated as secondary. Where the academic model is asserted, it is corroborated
  empirically by a pre-AI law review in the back-test corpus rather than by an
  ingested manual.

### What did NOT change

- §4 (legal and licensing constraints) — unchanged and still binding. No
  copyrighted manual is ingested; the name "Bluebook" stays out of the package,
  repo and tool names.
- The 99.5% release gate, the corpus minimums, the phase order, and every other
  non-goal (foreign/international citations, legislative history, substance
  checking, LLM-free engine, no GUI) — all unchanged.
