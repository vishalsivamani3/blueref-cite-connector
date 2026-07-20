/**
 * Document-level short-form context validation — Indigo R15.3.3.
 *
 * Per-citation checking cannot tell whether an `id.` points at the right authority;
 * that depends on what precedes it. This module supplies the missing half, and is
 * what `check_document` uses.
 *
 * The rule, from R15.3.3 and its Indigo Inkling:
 *
 *   - `id.` refers ONLY to the immediately preceding citation, and "the standard
 *     for what is immediately preceding is strict".
 *   - It may follow a citation to "one and only one source" (full or short).
 *   - It may NOT follow a string citation of two or more sources — "even to
 *     attempt to refer to the final citation in the string".
 *   - It may NOT follow an intervening textual reference to another authority.
 *   - EXCEPTION: a citation appearing inside an explanatory parenthetical
 *     ("… (citing X)") does NOT become the immediately preceding citation, so it
 *     does not foreclose `id.`.
 *
 * It also validates `supra` back-references (R29.2): "use supra when you've used the
 * full citation before", so a `supra note N` must point at an EARLIER footnote.
 *
 * Violations use SHORTFORM_CONTEXT, the taxonomy code reserved for exactly this.
 */
import type { ErrorCode, Violation } from './types.js';

/** An `id.` citation, optionally with a pincite, optionally italicized. */
const IS_ID = /^\s*\*?\s*(Id|id|Ibid|ibid)\.?\s*\*?(?:\s+(?:at\s+)?[\d.\-–]+)?\s*\.?\s*$/;

/** Contains an `id.` anywhere (e.g. "See id. at 5"). */
const HAS_ID = /(?:^|[\s(;*])\*?(?:Id|id)\.\*?(?=[\s,.;)*]|$)/;

/** Explanatory parentheticals whose inner citation does not "count" (R15.3.3 exception). */
const INNER_CITATION_PAREN = /\((?:citing|quoting|cited in|quoted in|discussing|construing)\b/i;

/**
 * Count the sources a footnote cites at TOP level.
 *
 * Semicolons separate sources in a string citation. Parentheticals are stripped
 * first so that a citation-within-a-parenthetical is not miscounted as a second
 * source — that is the R15.3.3 exception, and getting it wrong would produce a
 * spurious error on a correct `id.`
 */
export function topLevelSourceCount(footnote: string): number {
  let depth = 0;
  let stripped = '';
  for (const ch of footnote) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0) stripped += ch;
  }
  const parts = stripped
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  // A segment counts as a source if it carries a citation signal: a reporter-ish
  // "<vol> <something> <page>", a section symbol, or a year parenthetical.
  const looksLikeCitation = (p: string): boolean =>
    /\d+\s+[A-Za-z][A-Za-z0-9.'&\s]*\s+\d+/.test(p) || /§/.test(p) || /\(\d{4}\)/.test(footnote);
  const n = parts.filter(looksLikeCitation).length;
  return n === 0 ? (parts.length ? 1 : 0) : n;
}

/** "… supra note 5 …" — captures the referenced footnote number. */
const SUPRA_NOTE = /\bsupra\b[^,.;]{0,12}?\bnote\s+(\d+)/i;

export interface ContextIssue {
  /** 1-based index of the footnote the issue belongs to. */
  index: number;
  violation: Violation;
}

/**
 * Validate `id.` usage across an ordered footnote list (R15.3.3).
 *
 * Returns one issue per offending footnote. Footnotes that do not use `id.` are
 * unaffected, and a correct `id.` produces nothing.
 */
export function validateIdContext(footnotes: string[]): ContextIssue[] {
  const issues: ContextIssue[] = [];

  for (let i = 0; i < footnotes.length; i++) {
    const fn = (footnotes[i] ?? '').trim();
    if (!fn) continue;

    // --- supra back-reference (R29.2) ---
    const sup = SUPRA_NOTE.exec(fn);
    if (sup) {
      const target = Number(sup[1]);
      const self = i + 1;
      if (target >= self) {
        issues.push({
          index: self,
          violation: {
            code: 'SHORTFORM_CONTEXT',
            message:
              `"supra note ${target}" must refer to an EARLIER citation; this is footnote ${self} ` +
              '(R29.2: supra is used where the full citation was given before).',
            rule: 'IB R29.2',
            fix: '',
          },
        });
      } else if (target < 1) {
        issues.push({
          index: self,
          violation: {
            code: 'SHORTFORM_CONTEXT',
            message: `"supra note ${target}" is not a valid footnote reference (R29.2).`,
            rule: 'IB R29.2',
            fix: '',
          },
        });
      }
      continue; // a supra footnote is not an id. footnote
    }
    const usesId = IS_ID.test(fn) || HAS_ID.test(fn);
    if (!usesId) continue;

    const code: ErrorCode = 'SHORTFORM_CONTEXT';

    // (a) Nothing precedes it.
    if (i === 0) {
      issues.push({
        index: i + 1,
        violation: {
          code,
          message:
            '"id." has no preceding citation to refer to; it must follow the immediately preceding citation (R15.3.3).',
          rule: 'IB R15.3.3',
          fix: '',
        },
      });
      continue;
    }

    // Walk back past any empty footnotes to the actual preceding one.
    let j = i - 1;
    while (j >= 0 && !(footnotes[j] ?? '').trim()) j--;
    if (j < 0) {
      issues.push({
        index: i + 1,
        violation: {
          code,
          message: '"id." has no preceding citation to refer to (R15.3.3).',
          rule: 'IB R15.3.3',
          fix: '',
        },
      });
      continue;
    }
    const prev = (footnotes[j] ?? '').trim();

    // (b) The preceding footnote is itself an `id.` — that is fine; it chains back
    // to the same single source.
    if (IS_ID.test(prev)) continue;

    // (c) The preceding citation must cite one and only one source. A citation
    // inside an explanatory parenthetical does not count (the R15.3.3 exception).
    const count = topLevelSourceCount(prev);
    if (count > 1) {
      issues.push({
        index: i + 1,
        violation: {
          code,
          message:
            `"id." cannot follow a string citation of ${count} sources — not even to refer to the last one ` +
            '(R15.3.3). Use the short form of the intended source instead.',
          rule: 'IB R15.3.3',
          fix: '',
        },
      });
      continue;
    }

    // (d) An inner citation in a parenthetical is explicitly permitted; noted here
    // so the exception is visible rather than accidental.
    void INNER_CITATION_PAREN;
  }

  return issues;
}
