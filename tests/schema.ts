/**
 * Corpus entry type + validator (PRD Section 7.4).
 *
 * Shared by the generator (tests/generate.ts) and the harness (tests/harness.ts)
 * so the corpus can never drift from the schema or the §7.5 error taxonomy.
 */
import { ERROR_CODES, type ErrorCode, type CitationType } from '../src/engine/types.js';

export type Provenance = 'hand-verified' | 'synthetic';
export type Mode = 'check' | 'format';

export interface CorpusEntry {
  id: string;
  type: CitationType;
  mode: Mode;
  /** Present for `check` mode: the (possibly malformed) citation string. */
  input?: string;
  /** Present for `format` mode: structured components for the formatter. */
  components?: Record<string, unknown>;
  /** Exact expected error-code set for `check` mode. Empty for a clean citation. */
  expected_violations: ErrorCode[];
  /** Exact expected canonical citation (with typeface markers). */
  expected_output: string;
  /** Indigo Book rule reference(s), e.g. ["IB R11.2", "IB T7"]. */
  rules: string[];
  provenance: Provenance;
  /**
   * Required for `hand-verified` entries: where the citation was verified against
   * (e.g. "89 Harv. L. Rev. 1685 (1976), fn. 12"). Anchors the pre-AI back-test
   * (PRD Section 7.3; see tests/corpus/backtest/README.md).
   */
  source?: string;
  notes?: string;
}

const CITATION_TYPES: readonly CitationType[] = [
  'case',
  'statute',
  'periodical',
  'book',
  'shortform',
];

const ERROR_CODE_SET = new Set<string>(ERROR_CODES);

/** Validate a single entry. Returns a list of human-readable problems (empty = valid). */
export function validateEntry(e: CorpusEntry): string[] {
  const problems: string[] = [];
  // <type>-<4 digits>, with an optional single-letter track prefix on the number
  // (e.g. "case-0001" dev, "case-b0001" back-test).
  if (!e.id || !/^[a-z]+-[a-z]?\d{4}$/.test(e.id)) {
    problems.push(`id "${e.id}" must match <type>-[<letter>]<4 digits>`);
  }
  if (!CITATION_TYPES.includes(e.type)) {
    problems.push(`type "${e.type}" is not a supported citation type`);
  }
  if (e.mode !== 'check' && e.mode !== 'format') {
    problems.push(`mode "${e.mode}" must be "check" or "format"`);
  }
  if (e.mode === 'check' && typeof e.input !== 'string') {
    problems.push('check-mode entry requires a string `input`');
  }
  if (e.mode === 'format' && (typeof e.components !== 'object' || e.components === null)) {
    problems.push('format-mode entry requires a `components` object');
  }
  if (!Array.isArray(e.expected_violations)) {
    problems.push('expected_violations must be an array');
  } else {
    for (const code of e.expected_violations) {
      if (!ERROR_CODE_SET.has(code)) {
        problems.push(`expected_violations contains unknown code "${code}" (not in §7.5 taxonomy)`);
      }
    }
  }
  if (typeof e.expected_output !== 'string' || e.expected_output.length === 0) {
    problems.push('expected_output must be a non-empty string');
  }
  if (!Array.isArray(e.rules) || e.rules.length === 0) {
    problems.push('rules must be a non-empty array of Indigo Book references');
  }
  if (e.provenance !== 'hand-verified' && e.provenance !== 'synthetic') {
    problems.push(`provenance "${e.provenance}" must be "hand-verified" or "synthetic"`);
  }
  if (e.provenance === 'hand-verified' && (typeof e.source !== 'string' || e.source.length === 0)) {
    problems.push('hand-verified entries require a non-empty `source` (where it was verified)');
  }
  return problems;
}

/** Normalize whitespace for exact-match comparison (PRD Section 7.2). */
export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Compare two error-code sets ignoring order and duplicates (PRD Section 7.2). */
export function sameViolationSet(a: ErrorCode[], b: ErrorCode[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const c of sa) if (!sb.has(c)) return false;
  return true;
}
