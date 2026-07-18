/**
 * Case citation rule module (Indigo Book 2.0: R11 cases, R11.3.1 common-word
 * abbreviations, R12.2 court abbreviations, T1/T3 reporters, R2.1 typeface).
 *
 * Handles long-form case citations of the shape:
 *   <name>, <vol> <reporter> <page>[, <pincite>] (<court>? <year>)
 * e.g. "Smith v. Jones, 123 F.3d 456, 460 (7th Cir. 1999)".
 *
 * Style-aware (Indigo R2.1): under the "practitioner" style the case name is
 * italicized ("*Smith v. Jones*"); under "academic" (law-review full cites) it
 * is roman. The Indigo Book specifies the practitioner convention; academic
 * typeface is out of Indigo scope (R1.2) and treated as secondary.
 *
 * Self-contained per PRD Section 12: imports only shared types and data tables.
 * Pure and deterministic — no LLM, no network, no randomness.
 *
 * Scope note (honest incompleteness, flagged for the pre-AI back-test): the
 * institutional-word abbreviations here are a verified *subset* of Indigo Book
 * R11.3.1, not the full table. Each is verifiable against R11.3.1; the held-out
 * back-test grows it toward completeness, rather than trusting a large synthetic
 * table.
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
import courtsData from '../../data/courts.json' with { type: 'json' };

type TableEntry = { full: string; variants: string[] };
const REPORTERS = reportersData.reporters as Record<string, TableEntry>;
const COURTS = courtsData.courts as Record<string, TableEntry>;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** canonical <- any variant, for reporters and courts. */
function buildLookup(table: Record<string, TableEntry>): {
  canonical: Set<string>;
  variantToCanonical: Map<string, string>;
  tokens: string[];
} {
  const canonical = new Set<string>();
  const variantToCanonical = new Map<string, string>();
  const tokens: string[] = [];
  for (const [key, entry] of Object.entries(table)) {
    canonical.add(key);
    tokens.push(key);
    for (const v of entry.variants) {
      variantToCanonical.set(v, key);
      tokens.push(v);
    }
  }
  // Longest first so "F. Supp. 2d" wins over "F." and "F. 3d" over "F.".
  tokens.sort((a, b) => b.length - a.length);
  return { canonical, variantToCanonical, tokens };
}

const REPORTER_LOOKUP = buildLookup(REPORTERS);
const COURT_LOOKUP = buildLookup(COURTS);

const REPORTER_ALT = REPORTER_LOOKUP.tokens.map(escapeRegExp).join('|');

/**
 * The citation "core" at the end of the pre-parenthetical segment:
 * <vol> <reporter> <page>[, [at ]<pincite>]
 */
const CORE_RE = new RegExp(
  `(\\d+)\\s+(${REPORTER_ALT})\\s+(\\d+)(?:,\\s*(at\\s+)?(\\d+))?\\s*$`,
);

/**
 * Institutional-word abbreviations (verified subset of Indigo Book T6). Applied
 * to the case name. Keys are the unabbreviated form; the `(s?)` handles regular
 * plurals (e.g. Ass'ns). Correct form on the left → abbreviation on the right.
 */
const WORD_ABBREV: Array<{ full: RegExp; abbrev: string }> = [
  { full: /\bAssociation(s?)\b/g, abbrev: "Ass'n$1" },
  { full: /\bCorporation(s?)\b/g, abbrev: 'Corp.$1' },
  { full: /\bCompany(s?)\b/g, abbrev: 'Co.$1' },
  { full: /\bUniversity(s?)\b/g, abbrev: 'Univ.$1' },
  { full: /\bRailroad(s?)\b/g, abbrev: 'R.R.$1' },
  { full: /\bInternational(s?)\b/g, abbrev: "Int'l$1" },
  // Added after the pre-AI back-test surfaced c0011/c0012 as false negatives.
  // "Services" is listed before "Service" so the plural matches first (the plural
  // of "Serv." is "Servs.", not "Serv.s", so it can't use the (s?) form).
  { full: /\bDepartment(s?)\b/g, abbrev: "Dep't$1" },
  { full: /\bServices\b/g, abbrev: 'Servs.' },
  { full: /\bService\b/g, abbrev: 'Serv.' },
  { full: /\bSocial\b/g, abbrev: 'Soc.' },
  { full: /\bCommissioner(s?)\b/g, abbrev: "Comm'r$1" },
  { full: /\bGovernment(s?)\b/g, abbrev: "Gov't$1" },
  // Owner-directed strict-T6 pass (2026-07-18). Standard Indigo/Bluebook T6
  // case-name abbreviations; each is verifiable against T6 and awaits back-test
  // confirmation. NOTE: "District" is intentionally omitted — "District of
  // Columbia" is conventionally left unabbreviated.
  { full: /\bBoard(s?)\b/g, abbrev: 'Bd.$1' },
  { full: /\bEducation\b/g, abbrev: 'Educ.' },
  { full: /\bCounty(s?)\b/g, abbrev: 'Cnty.$1' },
  { full: /\bAuthority(s?)\b/g, abbrev: 'Auth.$1' },
  { full: /\bCommittee(s?)\b/g, abbrev: 'Comm.$1' },
  { full: /\bMunicipal\b/g, abbrev: 'Mun.' },
  { full: /\bManufacturing\b/g, abbrev: 'Mfg.' },
  { full: /\bBrothers\b/g, abbrev: 'Bros.' },
  { full: /\bInsurance\b/g, abbrev: 'Ins.' },
  { full: /\bSystems?\b/g, abbrev: 'Sys.' },
  { full: /\bDevelopment\b/g, abbrev: 'Dev.' },
  { full: /\bNational\b/g, abbrev: "Nat'l" },
];

interface CaseComponents {
  name: string;
  volume: string;
  reporter: string;
  page: string;
  pincite?: string;
  court?: string;
  year: string;
}

function detect(input: string): number {
  const s = input.trim();
  const hasParty = /\sv\.\s|\svs\.\s/.test(s);
  const hasYearParen = /\((?:[^)]*\s)?\d{4}\)\s*$/.test(s);
  const hasCore = CORE_RE.test(s.replace(/\s*\([^)]*\)\s*$/, ''));
  // The reporter core + a year parenthetical is the strongest signal, and it
  // covers non-adversary cases ("In re X", "Ex parte X") that have no "v.".
  if (hasCore && hasYearParen) return hasParty ? 0.97 : 0.9;
  if (hasParty && hasCore) return 0.8;
  if (hasParty) return 0.4;
  return 0.05;
}

function parse(input: string): ParseResult {
  const s = input.trim();
  const parenMatch = /\(([^)]*)\)\s*$/.exec(s);
  if (!parenMatch) {
    return { ok: false, code: 'PARSE_FAIL', message: 'No closing parenthetical (court/year) found.' };
  }
  const parenBody = parenMatch[1]!.trim();
  const yearMatch = /(\d{4})\s*$/.exec(parenBody);
  if (!yearMatch) {
    return { ok: false, code: 'PARSE_FAIL', message: 'No four-digit year in the parenthetical.' };
  }
  const year = yearMatch[1]!;
  const court = parenBody.slice(0, yearMatch.index).trim();

  const prefix = s.slice(0, parenMatch.index).trim();
  const core = CORE_RE.exec(prefix);
  if (!core) {
    return { ok: false, code: 'PARSE_FAIL', message: 'Could not locate <vol> <reporter> <page> before the parenthetical.' };
  }
  const [, volume, reporter, page, , pincite] = core;
  const hasAt = Boolean(core[4]);
  let name = prefix.slice(0, core.index).replace(/,\s*$/, '').trim();
  // Strip italic typeface markers around the whole case name (Indigo R2.1); the
  // style-check below verifies whether they should be present.
  const nameItalic = /^\*.+\*$/.test(name);
  if (nameItalic) name = name.slice(1, -1).trim();
  if (!name) {
    return { ok: false, code: 'PARSE_FAIL', message: 'Empty case name.' };
  }

  const components: CaseComponents & { pinciteHasAt: boolean; nameItalic: boolean } = {
    name,
    volume: volume!,
    reporter: reporter!,
    page: page!,
    year,
    pinciteHasAt: hasAt,
    nameItalic,
    ...(pincite ? { pincite } : {}),
    ...(court ? { court } : {}),
  };
  return {
    ok: true,
    citation: { type: 'case', raw: input, components: components as unknown as Record<string, unknown> },
  };
}

/** Rebuild the canonical citation from (already-corrected) components. */
function assemble(c: CaseComponents): string {
  const pin = c.pincite ? `, ${c.pincite}` : '';
  const paren = c.court ? `(${c.court} ${c.year})` : `(${c.year})`;
  return `${c.name}, ${c.volume} ${c.reporter} ${c.page}${pin} ${paren}`;
}

function check(parsed: Citation, style: Style): CheckResult {
  const c = parsed.components as unknown as CaseComponents & {
    pinciteHasAt?: boolean;
    nameItalic?: boolean;
  };
  const violations: Violation[] = [];

  // --- case name: "vs." -> "v." (punctuation) ---
  let name = c.name;
  if (/\svs\.\s/.test(name)) {
    violations.push({
      code: 'PUNCTUATION',
      message: 'Use "v." (not "vs.") between parties.',
      rule: 'IB R11.2',
      fix: name.replace(/\svs\.\s/g, ' v. '),
    });
    name = name.replace(/\svs\.\s/g, ' v. ');
  }

  // --- case name: institutional-word abbreviations (subset of R11.3.1) ---
  for (const { full, abbrev } of WORD_ABBREV) {
    if (full.test(name)) {
      const fixed = name.replace(full, abbrev);
      violations.push({
        code: 'ABBREV',
        message: 'Abbreviate the institutional word in the case name per Indigo R11.3.1.',
        rule: 'IB R11.3.1',
        fix: fixed,
      });
      name = fixed;
    }
  }

  // --- reporter: normalize variant -> canonical (spacing vs. abbrev) ---
  let reporter = c.reporter;
  if (!REPORTER_LOOKUP.canonical.has(reporter)) {
    const canonical = REPORTER_LOOKUP.variantToCanonical.get(reporter);
    if (canonical) {
      const spacingOnly = canonical.replace(/\s/g, '') === reporter.replace(/\s/g, '');
      violations.push({
        code: spacingOnly ? 'SPACING' : 'ABBREV',
        message: spacingOnly
          ? `Reporter spacing: "${reporter}" should be "${canonical}".`
          : `Reporter abbreviation: "${reporter}" should be "${canonical}".`,
        rule: spacingOnly ? 'IB R11.6.2' : 'IB T1',
        fix: canonical,
      });
      reporter = canonical;
    } else {
      // Unrecognized reporter: flag, do not guess (PRD Section 11.2).
      violations.push({
        code: 'ABBREV',
        message: `Unrecognized reporter "${reporter}"; cannot verify against tables T1/T3.`,
        rule: 'IB T1',
        fix: reporter,
      });
    }
  }

  // --- pincite: superfluous "at" ---
  if (c.pinciteHasAt) {
    violations.push({
      code: 'PINCITE',
      message: 'Drop "at" before the pincite in a full citation.',
      rule: 'IB R11.6',
      fix: c.pincite ?? '',
    });
  }

  // --- court: normalize variant -> canonical ---
  let court = c.court;
  if (court && !COURT_LOOKUP.canonical.has(court)) {
    const canonical = COURT_LOOKUP.variantToCanonical.get(court);
    if (canonical) {
      violations.push({
        code: 'DATE_COURT',
        message: `Court abbreviation: "${court}" should be "${canonical}".`,
        rule: 'IB R12.2',
        fix: canonical,
      });
      court = canonical;
    } else {
      violations.push({
        code: 'DATE_COURT',
        message: `Unrecognized court "${court}"; cannot verify against Indigo R12.2.`,
        rule: 'IB R12.2',
        fix: court,
      });
    }
  }

  // --- case-name typeface (Indigo R2.1): practitioner italicizes the case name;
  //     academic full cites keep it roman. ---
  const requiredItalic = style === 'practitioner';
  const currentItalic = Boolean(c.nameItalic);
  if (currentItalic !== requiredItalic) {
    violations.push({
      code: 'TYPEFACE',
      message: requiredItalic
        ? 'Italicize the case name (practitioner style, Indigo R2.1).'
        : 'Case name should be roman in an academic full citation, not italicized.',
      rule: 'IB R2.1',
      fix: requiredItalic ? `*${name}*` : name,
    });
  }
  const styledName = requiredItalic ? `*${name}*` : name;

  const corrected = assemble({
    name: styledName,
    volume: c.volume,
    reporter,
    page: c.page,
    year: c.year,
    ...(c.pincite ? { pincite: c.pincite } : {}),
    ...(court ? { court } : {}),
  });

  return { pass: violations.length === 0, violations, corrected };
}

function format(components: CitationInput, style: Style): string {
  const c = components as Partial<CaseComponents>;
  const bare = String(c.name ?? '').replace(/^\*(.+)\*$/, '$1');
  const name = style === 'practitioner' ? `*${bare}*` : bare;
  return assemble({
    name,
    volume: String(c.volume ?? ''),
    reporter: String(c.reporter ?? ''),
    page: String(c.page ?? ''),
    year: String(c.year ?? ''),
    ...(c.pincite ? { pincite: String(c.pincite) } : {}),
    ...(c.court ? { court: String(c.court) } : {}),
  });
}

export const caseModule: RuleModule = {
  id: 'case',
  detect,
  parse,
  check,
  format,
};
