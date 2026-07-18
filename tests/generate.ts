/**
 * Corpus generator (PRD Section 7.3).
 *
 * Reads the clean seeds, applies the deterministic mutators, and writes one
 * corpus file per citation type under tests/corpus/. All generated entries are
 * `provenance: "synthetic"` and subject to human spot-check (PRD Section 12).
 *
 * Run: `npm run corpus:gen`
 *
 * The mix follows PRD Section 7.3 (roughly 50% clean, 35% single-error, 15%
 * multi-error). Exact ratios are reported at the end so drift is visible.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CitationType, ErrorCode } from '../src/engine/types.js';
import { SEEDS, type Seed } from './seeds.js';
import { mutatorsFor } from './mutators.js';
import { validateEntry, type CorpusEntry } from './schema.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = join(HERE, 'corpus');

const TYPES: CitationType[] = ['case', 'statute', 'periodical', 'book'];

function uniqueCodes(codes: ErrorCode[]): ErrorCode[] {
  return [...new Set(codes)];
}

function mergeRules(seedRules: string[], extra?: string): string[] {
  if (!extra || seedRules.includes(extra)) return [...seedRules];
  return [...seedRules, extra];
}

function generateForType(type: CitationType): CorpusEntry[] {
  const seeds = SEEDS.filter((s) => s.type === type);
  const entries: CorpusEntry[] = [];
  let counter = 0;
  const nextId = (): string => `${type}-${String(++counter).padStart(4, '0')}`;

  for (const seed of seeds) {
    const clean = seed.citation;

    // 50% bucket: the clean canonical citation, checked as a pass-through.
    entries.push({
      id: nextId(),
      type,
      mode: 'check',
      input: clean,
      expected_violations: [],
      expected_output: clean,
      rules: seed.rules,
      provenance: 'synthetic',
      ...(seed.style && seed.style !== 'academic' ? { style: seed.style } : {}),
      notes: 'clean canonical',
    });

    // 35% bucket: one single-error entry per applicable mutator.
    const applied: { mutated: string; seed: Seed; code: ErrorCode; rule?: string; note: string }[] =
      [];
    for (const mut of mutatorsFor(type)) {
      const mutated = mut.apply(clean);
      if (mutated === null || mutated === clean) continue;
      applied.push({ mutated, seed, code: mut.code, note: mut.note, ...(mut.rule ? { rule: mut.rule } : {}) });
      entries.push({
        id: nextId(),
        type,
        mode: 'check',
        input: mutated,
        expected_violations: [mut.code],
        expected_output: clean,
        rules: mergeRules(seed.rules, mut.rule),
        provenance: 'synthetic',
      ...(seed.style && seed.style !== 'academic' ? { style: seed.style } : {}),
        notes: mut.note,
      });
    }

    // 15% bucket: one multi-error entry composing the first two applicable
    // mutators with distinct codes (e.g. SPACING + DATE_COURT).
    const muts = mutatorsFor(type);
    let multi: CorpusEntry | null = null;
    outer: for (let i = 0; i < muts.length; i++) {
      const s1 = muts[i]!.apply(clean);
      if (s1 === null || s1 === clean) continue;
      for (let j = i + 1; j < muts.length; j++) {
        if (muts[j]!.code === muts[i]!.code) continue;
        const s2 = muts[j]!.apply(s1);
        if (s2 === null || s2 === s1 || s2 === clean) continue;
        multi = {
          id: nextId(),
          type,
          mode: 'check',
          input: s2,
          expected_violations: uniqueCodes([muts[i]!.code, muts[j]!.code]),
          expected_output: clean,
          rules: mergeRules(mergeRules(seed.rules, muts[i]!.rule), muts[j]!.rule),
          provenance: 'synthetic',
      ...(seed.style && seed.style !== 'academic' ? { style: seed.style } : {}),
          notes: `multi-error: ${muts[i]!.note}; ${muts[j]!.note}`,
        };
        break outer;
      }
    }
    if (multi) entries.push(multi);
  }

  return entries;
}

function main(): void {
  const problems: string[] = [];
  const perType: Record<string, number> = {};
  const codeCounts: Record<string, number> = {};
  let clean = 0;
  let single = 0;
  let multi = 0;
  let total = 0;

  for (const type of TYPES) {
    const entries = generateForType(type);
    for (const e of entries) {
      const errs = validateEntry(e);
      if (errs.length) problems.push(`${e.id}: ${errs.join('; ')}`);
      const n = e.expected_violations.length;
      if (n === 0) clean++;
      else if (n === 1) single++;
      else multi++;
      for (const c of e.expected_violations) codeCounts[c] = (codeCounts[c] ?? 0) + 1;
    }
    perType[type] = entries.length;
    total += entries.length;
    writeFileSync(join(CORPUS_DIR, `${type}.json`), JSON.stringify(entries, null, 2) + '\n');
  }

  if (problems.length) {
    console.error('CORPUS VALIDATION FAILED:');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }

  const pct = (n: number): string => `${((n / total) * 100).toFixed(1)}%`;
  console.log('Corpus generated (all provenance: synthetic, subject to human spot-check).\n');
  console.log('Per type:');
  for (const type of TYPES) console.log(`  ${type.padEnd(12)} ${perType[type]}`);
  console.log(`  ${'TOTAL'.padEnd(12)} ${total}\n`);
  console.log('Mix (target 50 / 35 / 15):');
  console.log(`  clean         ${clean} (${pct(clean)})`);
  console.log(`  single-error  ${single} (${pct(single)})`);
  console.log(`  multi-error   ${multi} (${pct(multi)})\n`);
  console.log('Per error code:');
  for (const [code, n] of Object.entries(codeCounts).sort()) console.log(`  ${code.padEnd(18)} ${n}`);
}

main();
