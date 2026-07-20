/**
 * Short-form case citation module (Indigo Book 2.0: R15 short forms, R2.1 typeface).
 *
 * Covers the two short forms that attach to cases:
 *
 *   id.          R15.3   "Id."  /  "Id. at 1200"
 *   case short   R15.2.2 "<First Party>, <volume> <Reporter> at <pincite>"
 *                        e.g. "Fenton, 233 N.E.2d at 219"
 *
 * Per R15.2.2 the case name is italicized but **the comma after it is not**, so the
 * canonical marker placement is `*Fenton*, 233 N.E.2d at 219`. Per R2.1, `id.` is
 * italicized too. Both hold in either style, so short forms do not branch on style.
 *
 * SCOPE — format only. Whether an `id.` actually refers to the right authority is a
 * *context* question (R15.3.3: id. is forbidden after a string cite or an ambiguous
 * reference) and requires the ordered preceding footnotes. That is Phase 3
 * (`check_document`); this module never asserts contextual validity, and
 * SHORTFORM_CONTEXT is reserved for it.
 *
 *   supra        R29.2/R31.2  "Skinner, *supra*, at 21"
 *                              "Baumeister et al., *Bad Is Stronger than Good*, *supra* note 5, at 325"
 *
 * R29.2 spells out the marker placement: "an unitalicized comma followed by
 * italicized supra and followed by another unitalicized comma", then "the word
 * 'at' and the specific page being pincited". So the commas stay roman and only
 * `supra` is italicized — the same principle as the case-name comma in R15.2.2.
 *
 * Self-contained per PRD Section 12: imports only shared types and data tables.
 */
import type {
  Citation,
  CheckResult,
  CitationInput,
  ParseResult,
  RuleModule,
  Style,
  Violation,
} from '../types.js';
import reportersData from '../../data/reporters.json' with { type: 'json' };

type TableEntry = { full: string; variants: string[] };
const REPORTERS = reportersData.reporters as Record<string, TableEntry>;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Reporter lookup (built locally: rule modules may not import each other, PRD S12).
const CANONICAL = new Set<string>();
const VARIANT_TO_CANONICAL = new Map<string, string>();
const BY_DESPACED = new Map<string, string>();
const TOKENS: string[] = [];
for (const [key, entry] of Object.entries(REPORTERS)) {
  CANONICAL.add(key);
  TOKENS.push(key);
  BY_DESPACED.set(key.replace(/\s/g, ''), key);
  for (const v of entry.variants) {
    VARIANT_TO_CANONICAL.set(v, key);
    TOKENS.push(v);
  }
}
for (const key of [...CANONICAL]) {
  const despaced = key.replace(/\s/g, '');
  const m = /^(.*?)\s*(\d(?:d|th|st|nd))$/.exec(key);
  for (const form of [despaced, m && m[1] ? `${m[1].trim()} ${m[2]}` : '']) {
    if (!form || form === key || CANONICAL.has(form) || VARIANT_TO_CANONICAL.has(form)) continue;
    VARIANT_TO_CANONICAL.set(form, key);
    TOKENS.push(form);
  }
}
TOKENS.sort((a, b) => b.length - a.length);
const REPORTER_ALT = TOKENS.map(escapeRegExp).join('|');

/** "Id." / "id." / "Ibid." optionally italicized, with an optional "at <pincite>". */
const ID_RE = /^(\*)?\s*(Id|id|Ibid|ibid)(\.)?\s*(\*)?(?:\s+(?:(at)\s+)?(\d+(?:[-–]\d+)?))?\s*$/;

/** "<Name>, <vol> <Reporter> [at ]<pincite>" — R15.2.2. */
const CASE_SHORT_RE = new RegExp(
  `^(.+?),\\s+(\\d+)\\s+(${REPORTER_ALT})\\s+(?:(at)\\s+)?(\\d+(?:[-\\u2013]\\d+)?)\\s*$`,
);

/** A trailing (… year) parenthetical means this is a full citation, not a short form. */
const YEAR_PAREN_RE = /\((?:[^)]*\s)?\d{4}\)\s*$/;

/**
 * First-party names that R15.2.3 says not to shorten to: geographical or
 * governmental units, and party names used across many cases. When the first party
 * is one of these, the correct short form uses the *second* party, which we cannot
 * choose safely — so we flag without fabricating a fix.
 */
const AMBIGUOUS_FIRST_PARTY =
  /^(United States|State|People|Commonwealth|City|County|Cnty\.|Town|Village|Dep't|Board|Bd\.|In re|Ex parte|SEC|NLRB|FTC|EPA|FCC)\b/i;

/**
 * supra: <Author>[, <Shortened Title>], *supra*[ note <N>][, at <pincite>]
 * A section pincite ("§ 14.02") is permitted and does not take "at" (R29.2 example
 * "See Nimmer & Nimmer, supra, § 14.02").
 */
const SUPRA_RE =
  /^(.+?),\s*(\*)?\s*supra\s*(\*)?(?:\s+note\s+(\d+))?(?:\s*,\s*(?:(at)\s+)?(§+\s*[\dA-Za-z.()\][–-]+|\d+(?:[-–]\d+)?))?\s*\.?\s*$/i;

type ShortKind = 'id' | 'case-short' | 'supra';

interface ShortComponents {
  kind: ShortKind;
  /** supra forms */
  lead?: string;
  supraItalic?: boolean;
  note?: string;
  sectionPincite?: boolean;
  /** id. forms */
  word?: string;
  hasPeriod?: boolean;
  italic?: boolean;
  /** case-short forms */
  name?: string;
  nameItalic?: boolean;
  volume?: string;
  reporter?: string;
  /** both */
  hasAt?: boolean;
  pincite?: string;
}

function detect(input: string): number {
  const s = input.trim();
  if (YEAR_PAREN_RE.test(s)) return 0.05; // full citation
  if (ID_RE.test(s)) return 0.97;
  if (/\bsupra\b/i.test(s) && SUPRA_RE.test(s)) return 0.96;
  if (CASE_SHORT_RE.test(s)) return 0.95;
  return 0.05;
}

function stripItalic(s: string): { text: string; italic: boolean } {
  const italic = /^\*.+\*$/.test(s);
  return { text: italic ? s.slice(1, -1).trim() : s, italic };
}

function parse(input: string): ParseResult {
  const s = input.trim();
  if (YEAR_PAREN_RE.test(s)) {
    return {
      ok: false,
      code: 'TYPE_MISDETECT',
      message: 'Input has a year parenthetical; it is a full citation, not a short form.',
    };
  }

  const idMatch = ID_RE.exec(s);
  if (idMatch) {
    const components: ShortComponents = {
      kind: 'id',
      word: idMatch[2]!,
      hasPeriod: Boolean(idMatch[3]),
      italic: Boolean(idMatch[1] && idMatch[4]),
      hasAt: Boolean(idMatch[5]),
      ...(idMatch[6] ? { pincite: idMatch[6] } : {}),
    };
    return {
      ok: true,
      citation: { type: 'shortform', raw: input, components: components as unknown as Record<string, unknown> },
    };
  }

  const sup = /\bsupra\b/i.test(s) ? SUPRA_RE.exec(s) : null;
  if (sup) {
    const lead = sup[1]!.trim();
    if (!lead) return { ok: false, code: 'PARSE_FAIL', message: 'supra reference has no author.' };
    const pin = sup[6]?.trim();
    const components: ShortComponents = {
      kind: 'supra',
      lead,
      supraItalic: Boolean(sup[2] && sup[3]),
      hasAt: Boolean(sup[5]),
      sectionPincite: Boolean(pin && /^§/.test(pin)),
      ...(sup[4] ? { note: sup[4] } : {}),
      ...(pin ? { pincite: pin } : {}),
    };
    return {
      ok: true,
      citation: { type: 'shortform', raw: input, components: components as unknown as Record<string, unknown> },
    };
  }

  const cs = CASE_SHORT_RE.exec(s);
  if (cs) {
    const { text: name, italic } = stripItalic(cs[1]!.trim());
    if (!name) return { ok: false, code: 'PARSE_FAIL', message: 'Empty case name in short form.' };
    const components: ShortComponents = {
      kind: 'case-short',
      name,
      nameItalic: italic,
      volume: cs[2]!,
      reporter: cs[3]!,
      hasAt: Boolean(cs[4]),
      pincite: cs[5]!,
    };
    return {
      ok: true,
      citation: { type: 'shortform', raw: input, components: components as unknown as Record<string, unknown> },
    };
  }

  return {
    ok: false,
    code: 'PARSE_FAIL',
    message: 'Not a recognized short form (expected "id. [at N]" or "<Name>, <vol> <Reporter> at <N>").',
  };
}

function assemble(c: ShortComponents): string {
  if (c.kind === 'supra') {
    const note = c.note ? ` note ${c.note}` : '';
    // R29.2: section pincites do not take "at"; page pincites do.
    const pin = c.pincite ? (c.sectionPincite ? `, ${c.pincite}` : `, at ${c.pincite}`) : '';
    return `${c.lead}, *supra*${note}${pin}`;
  }
  if (c.kind === 'id') {
    const word = `*${c.word}.*`;
    return c.pincite ? `${word} at ${c.pincite}` : word;
  }
  return `*${c.name}*, ${c.volume} ${c.reporter} at ${c.pincite}`;
}

function check(parsed: Citation, _style: Style): CheckResult {
  const c = parsed.components as unknown as ShortComponents;
  const violations: Violation[] = [];

  if (c.kind === 'id') {
    // "Ibid." is not used; the short form is "Id." (R15.3).
    let word = c.word!;
    if (/^ibid$/i.test(word)) {
      violations.push({
        code: 'ABBREV',
        message: 'Use "Id.", not "Ibid.".',
        rule: 'IB R15.3',
        fix: word[0] === 'I' ? 'Id.' : 'id.',
      });
      word = word[0] === 'I' ? 'Id' : 'id';
    }
    if (!c.hasPeriod) {
      violations.push({
        code: 'PUNCTUATION',
        message: '"Id." takes a period.',
        rule: 'IB R15.3',
        fix: `${word}.`,
      });
    }
    if (!c.italic) {
      violations.push({
        code: 'TYPEFACE',
        message: 'Italicize "id." (Indigo R2.1 — cross references are italicized).',
        rule: 'IB R2.1',
        fix: `*${word}.*`,
      });
    }
    if (c.pincite && !c.hasAt) {
      violations.push({
        code: 'PINCITE',
        message: 'Use "at" before the pincite in a short form (R15.3.2).',
        rule: 'IB R15.3.2',
        fix: `at ${c.pincite}`,
      });
    }
    const corrected = assemble({ ...c, word, ...(c.pincite ? { pincite: c.pincite } : {}) });
    return { pass: violations.length === 0, violations, corrected };
  }

  if (c.kind === 'supra') {
    if (!c.supraItalic) {
      violations.push({
        code: 'TYPEFACE',
        message:
          'Italicize "supra"; the commas around it stay roman (Indigo R29.2, R2.1).',
        rule: 'IB R29.2',
        fix: '*supra*',
      });
    }
    if (c.pincite && !c.sectionPincite && !c.hasAt) {
      violations.push({
        code: 'PINCITE',
        message: 'A supra reference gives "at" and the page pincited (R29.2).',
        rule: 'IB R29.2',
        fix: `at ${c.pincite}`,
      });
    }
    return { pass: violations.length === 0, violations, corrected: assemble(c) };
  }

  // --- case short form (R15.2.2) ---
  let name = c.name!;

  // The short form omits "v." and the second party (R15.2.2).
  if (/\sv\.\s|\svs\.\s/.test(name)) {
    const first = name.split(/\svs?\.\s/)[0]!.trim();
    const safe = !AMBIGUOUS_FIRST_PARTY.test(first);
    violations.push({
      code: 'ORDERING',
      message: safe
        ? 'A case short form omits "v." and the second party (R15.2.2).'
        : 'A case short form omits "v." and the second party (R15.2.2); the first party here is a ' +
          'governmental or geographical unit, so R15.2.3 requires choosing the other party — ' +
          'resolve manually.',
      rule: safe ? 'IB R15.2.2' : 'IB R15.2.3',
      fix: safe ? first : '',
    });
    if (safe) name = first;
  }

  let reporter = c.reporter!;
  if (!CANONICAL.has(reporter)) {
    const canonical = VARIANT_TO_CANONICAL.get(reporter) ?? BY_DESPACED.get(reporter.replace(/\s/g, ''));
    if (canonical && canonical !== reporter) {
      const spacingOnly = canonical.replace(/\s/g, '') === reporter.replace(/\s/g, '');
      violations.push({
        code: spacingOnly ? 'SPACING' : 'ABBREV',
        message: `Reporter: "${reporter}" should be "${canonical}".`,
        rule: spacingOnly ? 'IB R11.6.2' : 'IB T1',
        fix: canonical,
      });
      reporter = canonical;
    } else if (!canonical) {
      violations.push({
        code: 'ABBREV',
        message: `Unrecognized reporter "${reporter}"; cannot verify against tables T1/T3.`,
        rule: 'IB T1',
        fix: reporter,
      });
    }
  }

  if (!c.hasAt) {
    violations.push({
      code: 'PINCITE',
      message: 'A case short form provides "at" with the pincite (R15.2.2).',
      rule: 'IB R15.2.2',
      fix: `at ${c.pincite}`,
    });
  }

  if (!c.nameItalic) {
    violations.push({
      code: 'TYPEFACE',
      message:
        'Italicize the case name in a short form; the comma after it is not italicized (R15.2.2, R2.1).',
      rule: 'IB R2.1',
      fix: `*${name}*`,
    });
  }

  const corrected = assemble({
    kind: 'case-short',
    name,
    volume: c.volume!,
    reporter,
    pincite: c.pincite!,
  });
  return { pass: violations.length === 0, violations, corrected };
}

function format(components: CitationInput, _style: Style): string {
  const c = components as Partial<ShortComponents>;
  if (c.kind === 'id') {
    return assemble({
      kind: 'id',
      word: String(c.word ?? 'Id'),
      ...(c.pincite ? { pincite: String(c.pincite) } : {}),
    });
  }
  return assemble({
    kind: 'case-short',
    name: String(c.name ?? '').replace(/^\*(.+)\*$/, '$1'),
    volume: String(c.volume ?? ''),
    reporter: String(c.reporter ?? ''),
    pincite: String(c.pincite ?? ''),
  });
}

export const shortformModule: RuleModule = {
  id: 'shortform',
  detect,
  parse,
  check,
  format,
};
