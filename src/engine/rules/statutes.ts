/**
 * Statute citation rule module (Indigo Book 2.0: R16 federal, R17 state).
 *
 * Forms, taken from the Indigo rules and their worked examples:
 *
 *   R16.1.1  <title> U.S.C. § <section>            "17 U.S.C. § 107"
 *            <Act name>, <title> U.S.C. §§ <range> "Federal Food, Drug, and
 *                                                   Cosmetic Act, 21 U.S.C. §§ 301-399i"
 *   R16.1.4  <title> U.S.C.A. § <section> (West)
 *            <title> U.S.C.S. § <section> (LexisNexis)
 *   R17.2.1  <Code name> § <section> (<year>)      "Fla. Stat. § 90.506 (2020)"
 *   R17.2.2  <Code name> § <section> (<Publisher> <year>)
 *                                                  "Tex. Est. Code Ann. § 251.107 (West 2019)"
 *
 * Two asymmetries that are easy to get wrong and are enforced here:
 *
 *   - **Federal years are OPTIONAL** (R16.1.2): omitting the year from a U.S.C.
 *     citation *means* the current version. A yearless U.S.C. cite is correct and
 *     must never be flagged.
 *   - **State years are REQUIRED** (R17.2.1, R17.3): a state code citation must
 *     carry a parenthetical with the code's year (and publisher where needed).
 *
 * Statutes carry no typeface — R17.2.1 notes state code citations are never
 * underlined — so this module does not branch on style.
 *
 * Self-contained per PRD Section 12: shared types only.
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

/** Section text: digits, letters, dots, parens, hyphens, ranges, comma lists. */
const SECTION = String.raw`[\dA-Za-z][\dA-Za-z.()\-–]*(?:\s*(?:to|through|,|and)\s*[\dA-Za-z][\dA-Za-z.()\-–]*)*`;

/** Federal: [Act name, ] <title> U.S.C.[A.|S.] §|§§ <sections> [(paren)] */
const FEDERAL_RE = new RegExp(
  String.raw`^(?:(.+?),\s+)?(\d+)\s+(U\.?\s?S\.?\s?C\.?(?:A\.|S\.)?)\s*(§§|§)\s*(${SECTION})(?:\s*\(([^)]*)\))?\s*\.?\s*$`,
);

/** State: <Code name> §|§§ <sections> (paren) — parenthetical required (R17.3). */
const STATE_RE = new RegExp(
  String.raw`^(.+?)\s*(§§|§)\s*(${SECTION})(?:\s*\(([^)]*)\))?\s*\.?\s*$`,
);

/**
 * An EXPLICIT multi-section marker requires the plural symbol (R16.1.1).
 *
 * A bare hyphen is deliberately NOT treated as one: "§§ 301-399i" is a range, but
 * "§ 51-3-22" (Indigo R17.2.1) is a SINGLE Georgia section whose number contains
 * hyphens. The two are structurally identical, so inferring plurality from a hyphen
 * produces spurious flags on valid citations — the worst failure mode. Where the
 * hyphen is ambiguous we accept whichever symbol the author used.
 */
const EXPLICIT_MULTI = /\bto\b|\bthrough\b|,|\band\b/;
const AMBIGUOUS_HYPHEN = /[-–]/;

const CANONICAL_FEDERAL = /^U\.S\.C\.(A\.|S\.)?$/;

interface StatuteComponents {
  kind: 'federal' | 'state';
  act?: string;
  title?: string;
  code: string;
  symbol: string;
  sections: string;
  paren?: string;
  /** true when the input had no space after the section symbol */
  tightSymbol: boolean;
  /**
   * true when a comma separates the code/chapter from the section symbol, as in
   * the chapter-based state formats: "Mass. Gen. Laws ch. 268, § 40 (2020)"
   * (Indigo T3). Dropping it silently corrupts the citation.
   */
  chapterComma?: boolean;
}

function detect(input: string): number {
  const s = input.trim();
  if (/\sv\.\s|\svs\.\s/.test(s)) return 0.05; // a case, not a statute
  if (!/§/.test(s) && !/\bU\.?\s?S\.?\s?C\b|United States Code/i.test(s)) return 0.05;
  if (FEDERAL_RE.test(s) || /United States Code/i.test(s)) return 0.96;
  if (STATE_RE.test(s)) return 0.9;
  return /§/.test(s) ? 0.6 : 0.05;
}

function parse(input: string): ParseResult {
  // Normalize a spelled-out code so the structural match can succeed; the check
  // stage reports it as an ABBREV violation.
  const s = input.trim().replace(/United States Code/gi, 'U.S.C.');
  // Consume the whole symbol run before the lookahead, else '§§ 301' backtracks
  // to a single '§' and sees the second '§' as a non-space.
  const tightSymbol = /§+(?!§)(?=\S)/.test(s);

  const fed = FEDERAL_RE.exec(s);
  if (fed) {
    const components: StatuteComponents = {
      kind: 'federal',
      title: fed[2]!,
      code: fed[3]!.replace(/\s+/g, ''),
      symbol: fed[4]!,
      sections: fed[5]!.replace(/\s+/g, ' ').trim(),
      tightSymbol,
      ...(fed[1] ? { act: fed[1].trim() } : {}),
      ...(fed[6] ? { paren: fed[6].trim() } : {}),
    };
    return { ok: true, citation: { type: 'statute', raw: input, components: components as unknown as Record<string, unknown> } };
  }

  const st = STATE_RE.exec(s);
  if (st) {
    const rawCode = st[1]!.replace(/\s+/g, ' ').trim();
    const chapterComma = /,$/.test(rawCode);
    const code = rawCode.replace(/,$/, '');
    if (!code) return { ok: false, code: 'PARSE_FAIL', message: 'Missing statutory code name.' };
    const components: StatuteComponents = {
      kind: 'state',
      code,
      symbol: st[2]!,
      sections: st[3]!.replace(/\s+/g, ' ').trim(),
      tightSymbol,
      chapterComma,
      ...(st[4] ? { paren: st[4].trim() } : {}),
    };
    return { ok: true, citation: { type: 'statute', raw: input, components: components as unknown as Record<string, unknown> } };
  }

  return { ok: false, code: 'PARSE_FAIL', message: 'Not a recognized statutory citation form (R16/R17).' };
}

function assemble(c: StatuteComponents): string {
  const paren = c.paren ? ` (${c.paren})` : '';
  const head = c.kind === 'federal' ? `${c.title} ${c.code}` : `${c.code}${c.chapterComma ? ',' : ''}`;
  const act = c.act ? `${c.act}, ` : '';
  return `${act}${head} ${c.symbol} ${c.sections}${paren}`;
}

function check(parsed: Citation, _style: Style): CheckResult {
  const c = parsed.components as unknown as StatuteComponents;
  const violations: Violation[] = [];

  // --- code abbreviation (R16.1.1 / T1) ---
  let code = c.code;
  if (c.kind === 'federal' && !CANONICAL_FEDERAL.test(code)) {
    violations.push({
      code: 'ABBREV',
      message: 'Abbreviate the code name as "U.S.C." (R16.1.1).',
      rule: 'IB R16.1.1',
      fix: 'U.S.C.',
    });
    code = 'U.S.C.';
  }
  if (/United States Code/i.test(parsed.raw)) {
    violations.push({
      code: 'ABBREV',
      message: 'Abbreviate "United States Code" as "U.S.C." (R16.1.1).',
      rule: 'IB R16.1.1',
      fix: 'U.S.C.',
    });
    code = code.replace(/United States Code/gi, 'U.S.C.');
  }

  // --- space after the section symbol ---
  if (c.tightSymbol) {
    violations.push({
      code: 'SPACING',
      message: 'Put a space between the section symbol and the section number.',
      rule: 'IB R16.1.1',
      fix: `${c.symbol} ${c.sections}`,
    });
  }

  // --- singular vs plural section symbol (R16.1.1: "§§ 301-399i") ---
  const explicitMulti = EXPLICIT_MULTI.test(c.sections);
  const ambiguous = !explicitMulti && AMBIGUOUS_HYPHEN.test(c.sections);
  let symbol = c.symbol;
  if (explicitMulti && c.symbol !== '§§') {
    violations.push({
      code: 'PUNCTUATION',
      message: 'Use "§§" when citing more than one section or a range of sections.',
      rule: 'IB R16.1.1',
      fix: '§§',
    });
    symbol = '§§';
  } else if (!explicitMulti && !ambiguous && c.symbol !== '§') {
    violations.push({
      code: 'PUNCTUATION',
      message: 'Use a single "§" when citing one section.',
      rule: 'IB R16.1.1',
      fix: '§',
    });
    symbol = '§';
  }

  // --- the date parenthetical ---
  // Federal years are OPTIONAL (R16.1.2) — a yearless U.S.C. cite is correct and
  // is deliberately NOT flagged. State code years are REQUIRED (R17.2.1, R17.3).
  if (c.kind === 'state' && !c.paren) {
    violations.push({
      code: 'DATE_COURT',
      message: 'A state code citation must give the year of the code in a parenthetical (R17.3).',
      rule: 'IB R17.3',
      fix: '(<year>)',
    });
  }

  const corrected = assemble({
    ...c,
    code,
    symbol,
    ...(c.paren ? { paren: c.paren } : {}),
  });
  return { pass: violations.length === 0, violations, corrected };
}

function format(components: CitationInput, _style: Style): string {
  const c = components as Partial<StatuteComponents>;
  const kind = c.kind === 'state' ? 'state' : 'federal';
  const sections = String(c.sections ?? '');
  return assemble({
    kind,
    code: String(c.code ?? (kind === 'federal' ? 'U.S.C.' : '')),
    symbol: String(c.symbol ?? (EXPLICIT_MULTI.test(sections) ? '§§' : '§')),
    sections,
    tightSymbol: false,
    ...(c.title ? { title: String(c.title) } : {}),
    ...(c.act ? { act: String(c.act) } : {}),
    ...(c.paren ? { paren: String(c.paren) } : {}),
  });
}

export const statuteModule: RuleModule = {
  id: 'statute',
  detect,
  parse,
  check,
  format,
};
