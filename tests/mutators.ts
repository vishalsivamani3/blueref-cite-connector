/**
 * Deterministic mutation operators (PRD Section 7.3).
 *
 * Each mutator turns a CLEAN canonical citation into a perturbed one and reports
 * the §7.5 error code(s) the perturbation introduces. Generation is fully
 * deterministic (no RNG) so the corpus is reproducible. A mutator returns `null`
 * when it does not apply to the given citation/type.
 *
 * The generator uses these to build the single-error (35%) and multi-error (15%)
 * buckets from the clean seeds; see PRD Section 7.3 and tests/generate.ts.
 */
import type { CitationType, ErrorCode } from '../src/engine/types.js';
import courtsData from '../src/data/courts.json' with { type: 'json' };
import periodicalsData from '../src/data/periodicals.json' with { type: 'json' };

const COURTS = courtsData.courts as Record<string, { full: string; variants: string[] }>;
const PERIODICALS = periodicalsData.periodicals as Record<
  string,
  { full: string; variants: string[] }
>;

export interface Mutator {
  key: string;
  code: ErrorCode;
  /** Extra Indigo Book rule ref introduced by this error, if any. */
  rule?: string;
  types: CitationType[];
  note: string;
  /** Apply to a clean citation; return the perturbed string or null if N/A. */
  apply(clean: string): string | null;
}

/** Reporter series printed with an erroneous internal space: F.3d -> F. 3d. */
const reporterSpacing: Mutator = {
  key: 'reporterSpacing',
  code: 'SPACING',
  rule: 'IB R11.2',
  types: ['case'],
  note: 'erroneous space in reporter series (e.g. F.3d written F. 3d)',
  apply(clean) {
    // Match a letter+period immediately followed by a series number, no space.
    const m = /([A-Z]\.)(2d|3d)\b/.exec(clean);
    if (!m) return null;
    return clean.replace(m[0], `${m[1]} ${m[2]}`);
  },
};

/** Court abbreviation spelled out: 7th Cir. -> 7th Circuit. */
const courtSpellOut: Mutator = {
  key: 'courtSpellOut',
  code: 'DATE_COURT',
  rule: 'IB T7',
  types: ['case'],
  note: 'court name not abbreviated per table T7',
  apply(clean) {
    for (const [canonical, info] of Object.entries(COURTS)) {
      if (clean.includes(canonical)) {
        const spelled =
          info.variants.find((v) => /circuit/i.test(v)) ?? info.variants[0];
        if (spelled && spelled !== canonical) {
          return clean.replace(canonical, spelled);
        }
      }
    }
    return null;
  },
};

/** Institutional word spelled out: Co. -> Company, Univ. -> University. */
const WORD_EXPANSIONS: Record<string, string> = {
  'Co.': 'Company',
  'Corp.': 'Corporation',
  'Univ.': 'University',
  'R.R.': 'Railroad',
  "Ass'n": 'Association',
  "Int'l": 'International',
};
const wordSpellOut: Mutator = {
  key: 'wordSpellOut',
  code: 'ABBREV',
  rule: 'IB T6',
  types: ['case', 'book'],
  note: 'institutional word not abbreviated per table T6',
  apply(clean) {
    for (const [abbrev, full] of Object.entries(WORD_EXPANSIONS)) {
      if (clean.includes(abbrev)) {
        return clean.replace(abbrev, full);
      }
    }
    return null;
  },
};

/**
 * Superfluous "at" before a pincite: "456, 460" -> "456, at 460".
 *
 * In a full citation the pincite follows the first page with just a comma; "at"
 * is used only in short forms (id. at 460) and page-only sources. This is a pure,
 * reversible format error (unlike a dropped pincite, which loses information the
 * checker cannot reconstruct and is not always required — see SCHEMA.md).
 */
const pinciteAt: Mutator = {
  key: 'pinciteAt',
  code: 'PINCITE',
  rule: 'IB R11',
  types: ['case', 'periodical'],
  note: 'superfluous "at" before pincite in a full citation',
  apply(clean) {
    if (!/, \d+ \(/.test(clean)) return null;
    return clean.replace(/, (\d+) \(/, ', at $1 (');
  },
};

/** "v." written "vs.". */
const vsPunctuation: Mutator = {
  key: 'vsPunctuation',
  code: 'PUNCTUATION',
  rule: 'IB R10',
  types: ['case'],
  note: '"v." written as "vs."',
  apply(clean) {
    if (!/ v\. /.test(clean)) return null;
    return clean.replace(' v. ', ' vs. ');
  },
};

/** Section symbol with no following space: "§ 1983" -> "§1983". */
const sectionSpacing: Mutator = {
  key: 'sectionSpacing',
  code: 'SPACING',
  rule: 'IB R12',
  types: ['statute'],
  note: 'missing space after section symbol',
  apply(clean) {
    if (!/§+ /.test(clean)) return null;
    return clean.replace(/(§+) /, '$1');
  },
};

/** "U.S.C." spelled out. */
const codeSpellOut: Mutator = {
  key: 'codeSpellOut',
  code: 'ABBREV',
  rule: 'IB T1',
  types: ['statute'],
  note: 'code name not abbreviated (U.S.C.)',
  apply(clean) {
    if (!clean.includes('U.S.C.')) return null;
    return clean.replace('U.S.C.', 'United States Code');
  },
};

/** Strip italics markers from the article title (missing required typeface). */
const stripItalics: Mutator = {
  key: 'stripItalics',
  code: 'TYPEFACE',
  rule: 'IB R13',
  types: ['periodical'],
  note: 'article title not italicized',
  apply(clean) {
    if (!clean.includes('*')) return null;
    return clean.replace(/\*([^*]+)\*/, '$1');
  },
};

/** Strip small-caps markers (missing required typeface). */
const stripSmallCaps: Mutator = {
  key: 'stripSmallCaps',
  code: 'TYPEFACE',
  rule: 'IB R13',
  types: ['periodical', 'book'],
  note: 'journal/book text not in large-and-small caps',
  apply(clean) {
    if (!clean.includes('%')) return null;
    return clean.replace(/%([^%]+)%/, '$1');
  },
};

/** Journal title spelled out inside the small-caps run. */
const journalSpellOut: Mutator = {
  key: 'journalSpellOut',
  code: 'ABBREV',
  rule: 'IB T13',
  types: ['periodical'],
  note: 'journal title not abbreviated per table T13',
  apply(clean) {
    for (const [canonical, info] of Object.entries(PERIODICALS)) {
      if (clean.includes(canonical)) {
        return clean.replace(canonical, info.full);
      }
    }
    return null;
  },
};

/** Ordinal edition abbreviation wrong: "2d ed." -> "2nd ed.". */
const editionOrdinal: Mutator = {
  key: 'editionOrdinal',
  code: 'ABBREV',
  rule: 'IB R15',
  types: ['book'],
  note: 'ordinal edition abbreviation not in academic form (2d/3d)',
  apply(clean) {
    const m = /\b(\d)(d) ed\./.exec(clean);
    if (!m) return null;
    const suffix = m[1] === '2' || m[1] === '3' ? (m[1] === '2' ? 'nd' : 'rd') : 'th';
    return clean.replace(m[0], `${m[1]}${suffix} ed.`);
  },
};

export const MUTATORS: Mutator[] = [
  reporterSpacing,
  courtSpellOut,
  wordSpellOut,
  pinciteAt,
  vsPunctuation,
  sectionSpacing,
  codeSpellOut,
  stripItalics,
  stripSmallCaps,
  journalSpellOut,
  editionOrdinal,
];

/** All mutators applicable to a given citation type. */
export function mutatorsFor(type: CitationType): Mutator[] {
  return MUTATORS.filter((m) => m.types.includes(type));
}
