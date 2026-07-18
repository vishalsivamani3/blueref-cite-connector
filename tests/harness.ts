/**
 * Corpus runner + accuracy reporting (PRD Sections 7.1, 7.2).
 *
 * Loads every corpus file, runs each entry through the deterministic engine, and
 * reports accuracy overall, per type, and per error code. A test passes only on
 * exact match after whitespace normalization; no partial credit (PRD Section 7.2).
 *
 * Usage:
 *   npm test          human-readable report
 *   npm run test:ci   same, plus enforce the current phase floor (exit 1 if below)
 *
 * Phase 0 note: no rule module is registered yet, so the engine returns
 * `unsupported` for every entry and accuracy is ~0%. That is expected. The gate
 * this phase is that the harness RUNS and REPORTS; the accuracy floor is 0 until
 * the first rule module lands (see tests/phase.json).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CitationType, ErrorCode } from '../src/engine/types.js';
import { ERROR_CODES } from '../src/engine/types.js';
import { checkCitation, formatCitation } from '../src/engine/index.js';
import {
  normalizeWhitespace,
  sameViolationSet,
  validateEntry,
  type CorpusEntry,
} from './schema.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = join(HERE, 'corpus');
const PHASE = JSON.parse(readFileSync(join(HERE, 'phase.json'), 'utf8')) as {
  phase: number;
  accuracyFloor: number;
  typeFloors?: Record<string, number>;
  releaseMinCounts: Record<string, number>;
  releaseTotal: number;
  releaseAccuracyFloor: number;
};

interface Result {
  entry: CorpusEntry;
  passed: boolean;
  reason: string;
}

function loadCorpus(dir: string): { entries: CorpusEntry[]; problems: string[] } {
  const entries: CorpusEntry[] = [];
  const problems: string[] = [];
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return { entries, problems };
  }
  const seenIds = new Set<string>();
  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      problems.push(`${file}: invalid JSON (${(e as Error).message})`);
      continue;
    }
    if (!Array.isArray(parsed)) {
      problems.push(`${file}: expected a JSON array of entries`);
      continue;
    }
    for (const e of parsed as CorpusEntry[]) {
      const errs = validateEntry(e);
      if (errs.length) problems.push(`${file}#${e.id ?? '?'}: ${errs.join('; ')}`);
      if (seenIds.has(e.id)) problems.push(`${file}#${e.id}: duplicate id`);
      seenIds.add(e.id);
      entries.push(e);
    }
  }
  return { entries, problems };
}

function runEntry(entry: CorpusEntry): Result {
  const expectedOut = normalizeWhitespace(entry.expected_output);

  if (entry.mode === 'format') {
    const out = formatCitation(entry.components ?? {}, entry.type);
    if (out.confidence === 'unsupported' || out.output === null) {
      return { entry, passed: false, reason: 'unsupported (no module registered)' };
    }
    const got = normalizeWhitespace(out.output);
    return got === expectedOut
      ? { entry, passed: true, reason: 'ok' }
      : { entry, passed: false, reason: `output mismatch: got "${got}"` };
  }

  // check mode
  const res = checkCitation(entry.input ?? '');
  if (res.confidence === 'unsupported') {
    // Refusing on an in-scope corpus entry is a failure, not a pass. This keeps
    // Phase 0 honest: clean entries do not "pass" just because the engine punted.
    return { entry, passed: false, reason: 'unsupported (no module registered)' };
  }
  const gotCodes = res.violations.map((v) => v.code) as ErrorCode[];
  const codesMatch = sameViolationSet(entry.expected_violations, gotCodes);
  const gotOut = normalizeWhitespace(res.corrected);
  const outMatch = gotOut === expectedOut;
  if (codesMatch && outMatch) return { entry, passed: true, reason: 'ok' };
  const why: string[] = [];
  if (!codesMatch) why.push(`codes: expected [${entry.expected_violations.join(', ')}], got [${gotCodes.join(', ')}]`);
  if (!outMatch) why.push(`output: got "${gotOut}"`);
  return { entry, passed: false, reason: why.join('; ') };
}

function pct(n: number, d: number): string {
  return d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(2)}%`;
}

function main(): void {
  const ci = process.argv.includes('--ci');
  const backtest = process.argv.includes('--backtest');
  const dir = backtest ? join(CORPUS_DIR, 'backtest') : CORPUS_DIR;
  const { entries, problems } = loadCorpus(dir);

  const results = entries.map(runEntry);
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;

  // Per type.
  const types: CitationType[] = ['case', 'statute', 'periodical', 'book', 'shortform'];
  const perType = new Map<string, { total: number; passed: number }>();
  for (const t of types) perType.set(t, { total: 0, passed: 0 });
  for (const r of results) {
    const s = perType.get(r.entry.type)!;
    s.total++;
    if (r.passed) s.passed++;
  }

  // Per error code (over entries that expect that code).
  const perCode = new Map<ErrorCode, { total: number; passed: number }>();
  for (const c of ERROR_CODES) perCode.set(c, { total: 0, passed: 0 });
  for (const r of results) {
    for (const c of r.entry.expected_violations) {
      const s = perCode.get(c)!;
      s.total++;
      if (r.passed) s.passed++;
    }
  }

  const track = backtest ? 'PRE-AI BACK-TEST (held-out, hand-verified)' : 'development (synthetic)';
  console.log(`BlueRef corpus harness — phase ${PHASE.phase} — ${track} track\n`);
  if (backtest && total === 0) {
    console.log('No back-test entries yet. Curate hand-verified pre-AI citations into');
    console.log('tests/corpus/backtest/ (see tests/corpus/backtest/README.md), then re-run.');
    return;
  }
  if (problems.length) {
    console.log(`Schema problems (${problems.length}):`);
    for (const p of problems.slice(0, 40)) console.log('  ! ' + p);
    if (problems.length > 40) console.log(`  ... and ${problems.length - 40} more`);
    console.log('');
  }

  console.log('Per type:');
  for (const t of types) {
    const s = perType.get(t)!;
    if (s.total === 0) continue;
    const target = PHASE.releaseMinCounts[t];
    const targetNote = target ? ` (release target ${target})` : '';
    console.log(`  ${t.padEnd(12)} ${String(s.passed).padStart(4)}/${String(s.total).padEnd(4)} ${pct(s.passed, s.total).padStart(8)}${targetNote}`);
  }

  console.log('\nPer error code:');
  for (const c of ERROR_CODES) {
    const s = perCode.get(c)!;
    if (s.total === 0) continue;
    console.log(`  ${c.padEnd(18)} ${String(s.passed).padStart(4)}/${String(s.total).padEnd(4)} ${pct(s.passed, s.total).padStart(8)}`);
  }

  const accuracy = total === 0 ? 0 : passed / total;
  console.log(`\nTOTAL: ${passed}/${total} = ${pct(passed, total)}`);
  console.log(`Corpus size: ${total} (release target ${PHASE.releaseTotal})`);
  console.log(`Phase ${PHASE.phase} accuracy floor: ${(PHASE.accuracyFloor * 100).toFixed(2)}%`);

  const failedFloor = accuracy < PHASE.accuracyFloor;
  const hasStructuralProblems = problems.length > 0;

  // Per-type floors gate each in-scope type independently (PRD Section 9).
  const typeFloors = PHASE.typeFloors ?? {};
  const typeFailures: string[] = [];
  if (!backtest) {
    for (const [t, floor] of Object.entries(typeFloors)) {
      const s = perType.get(t);
      if (!s || s.total === 0) continue;
      const acc = s.passed / s.total;
      if (acc < floor) {
        typeFailures.push(`${t}: ${pct(s.passed, s.total)} < floor ${(floor * 100).toFixed(2)}%`);
      }
    }
    if (Object.keys(typeFloors).length) {
      console.log('\nType floors:');
      for (const [t, floor] of Object.entries(typeFloors)) {
        const s = perType.get(t);
        const acc = s && s.total ? s.passed / s.total : 0;
        const ok = s && s.total ? acc >= floor : true;
        console.log(`  ${t.padEnd(12)} floor ${(floor * 100).toFixed(2)}%  ${ok ? 'PASS' : 'FAIL'}`);
      }
    }
  }

  if (ci) {
    if (hasStructuralProblems) {
      console.error('\nCI FAIL: corpus has schema problems (see above).');
      process.exit(1);
    }
    if (typeFailures.length) {
      console.error('\nCI FAIL: type floor(s) not met:');
      for (const f of typeFailures) console.error('  - ' + f);
      process.exit(1);
    }
    if (failedFloor) {
      console.error(`\nCI FAIL: accuracy ${pct(passed, total)} is below phase floor ${(PHASE.accuracyFloor * 100).toFixed(2)}%.`);
      process.exit(1);
    }
    console.log('\nCI PASS.');
  } else if (hasStructuralProblems) {
    // Non-CI runs still signal schema breakage loudly.
    process.exitCode = 1;
  }
}

main();
