/**
 * Back-test candidate runner.
 *
 * Runs Claude-drafted candidate citations (provenance "synthetic", awaiting human
 * verification) through the deterministic engine and classifies each result:
 *
 *   MATCH    — module output equals the drafted expectation. The shared assumption
 *              still needs human verification, but the module is self-consistent here.
 *   DIVERGE  — module disagrees with the drafted expectation. A priority finding:
 *              the module, the drafted expectation, or both are wrong. Human resolves.
 *   REFUSED  — module returned "unsupported". A coverage gap.
 *
 * These candidates are NOT the back-test. They are a worksheet: a human verifies
 * each against the cited source and The Indigo Book, then promotes the correct ones
 * into tests/corpus/backtest/ as provenance "hand-verified" (PRD Section 12).
 *
 * Run: `npm run candidates`
 */
import { readFileSync } from 'node:fs';
import { checkCitation } from '../../src/engine/index.js';
import { normalizeWhitespace, sameViolationSet, type CorpusEntry } from '../schema.js';

const FILE = new URL('./cases.json', import.meta.url);
const candidates = JSON.parse(readFileSync(FILE, 'utf8')) as Array<
  CorpusEntry & { candidate_for?: string; source?: string }
>;

type Verdict = 'MATCH' | 'DIVERGE' | 'REFUSED';

interface Row {
  id: string;
  verdict: Verdict;
  probe: string;
  detail: string;
}

const rows: Row[] = [];

for (const c of candidates) {
  const probe = (c.notes ?? '').replace(/^probe:\s*/, '').split('.')[0] ?? '';
  // Candidates are written in roman (academic) form; check them as such so the
  // worksheet stays meaningful under the practitioner default.
  const res = checkCitation(c.input ?? '', undefined, c.style ?? 'academic');

  if (res.confidence === 'unsupported') {
    rows.push({ id: c.id, verdict: 'REFUSED', probe, detail: 'module returned unsupported' });
    continue;
  }

  const gotCodes = res.violations.map((v) => v.code);
  const codesMatch = sameViolationSet(c.expected_violations, gotCodes);
  const outMatch = normalizeWhitespace(res.corrected) === normalizeWhitespace(c.expected_output);

  if (codesMatch && outMatch) {
    rows.push({ id: c.id, verdict: 'MATCH', probe, detail: 'ok' });
  } else {
    const bits: string[] = [];
    if (!codesMatch) bits.push(`codes exp [${c.expected_violations.join(', ')}] got [${gotCodes.join(', ')}]`);
    if (!outMatch) bits.push(`out got "${normalizeWhitespace(res.corrected)}"`);
    rows.push({ id: c.id, verdict: 'DIVERGE', probe, detail: bits.join('; ') });
  }
}

const icon: Record<Verdict, string> = { MATCH: 'ok ', DIVERGE: '!! ', REFUSED: '?? ' };
console.log('BlueRef back-test candidate worksheet (drafts — human must verify each)\n');
for (const r of rows) {
  console.log(`${icon[r.verdict]}${r.verdict.padEnd(8)} ${r.id}  ${r.probe}`);
  if (r.verdict !== 'MATCH') console.log(`             ${r.detail}`);
}

const count = (v: Verdict): number => rows.filter((r) => r.verdict === v).length;
console.log(`\n${rows.length} candidates: ${count('MATCH')} MATCH, ${count('DIVERGE')} DIVERGE, ${count('REFUSED')} REFUSED`);
console.log('\nMATCH = module self-consistent (still verify the shared assumption).');
console.log('DIVERGE / REFUSED = priority review: a real gap in the module OR in the draft.');
console.log('Verified-correct candidates -> promote into tests/corpus/backtest/ (provenance "hand-verified").');
