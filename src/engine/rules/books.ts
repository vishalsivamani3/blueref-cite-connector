/**
 * Book / non-periodical rule module — Indigo Book 2.0 R28 (full citations).
 *
 * R28.1 elements: volume (if part of a multi-volume set), author name(s), title,
 * and a parenthetical carrying edition/editor/translator information and the year.
 *
 *   Matthew Reidsma, Masked by Trust: Bias in Library Discovery (2019).
 *   Joseph Williams & Joseph Bizup, Style: Ten Lessons in Clarity and Grace (12th ed. 2016).
 *   Lawyers in Practice: Ethical Decision Making in Context (Leslie C. Levin & Lynn Mather eds., 2012).
 *
 * TYPEFACE — the style split, exactly as for periodicals:
 *   - R28.2   "Use standard roman type (not italicized) for the author name or names."
 *   - R28.2.3 "Place the publication title in italics."
 *     => practitioner: "Author, *Title* 45 (2014)"
 *   - Under the academic convention the author and title run together in
 *     large-and-small caps. Indigo puts academic typeface out of scope (R1.2), so
 *     that form is secondary and carries the %small caps% markers.
 *
 * R28.2.4 "Do not use 'at' before the pincite in a full citation" — a stray "at"
 * is a PINCITE violation, consistent with cases (R11.6) and periodicals (R30.1.1).
 *
 * Edited volumes have no author: the title leads and the editors sit in the
 * parenthetical ("… (Leslie C. Levin & Lynn Mather eds., 2012)").
 *
 * Known limitation: where a work lists three or more authors separated by commas,
 * the author/title split is taken at the first comma, which can mis-split. Two-author
 * works use "&" (R28.2.2) and are unaffected.
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

/**
 * Name suffixes belong to the author, not the title. Indigo R28.2.1: "Use titles
 * that follow an author's name (Sr.) but not titles that precede them (Hon.)".
 * Without this, "Richard H. Fallon, Jr., Judicially Manageable Standards" splits
 * into author "Richard H. Fallon" and title "Jr., Judicially Manageable Standards".
 */
const NAME_SUFFIX = /^(Jr\.|Sr\.|I{2,3}|IV|V|Ph\.?D\.?|M\.?D\.?|Esq\.|J\.?D\.?)$/i;

/** Regulations/administrative materials are a v1 non-goal (PRD 3) — refuse them. */
const REGULATION = /(?:^|\s)(C\.F\.R\.|Fed\.\s?Reg\.|Admin\.\s?Code)(?=\s|$)/i;

/** Pincite: a page, a page range, or a section/paragraph designator (R28.2.4). */
const PINCITE = String.raw`(?:§+\s*)?[\d][\dA-Za-z.\[\]()–\-]*`;

/** Academic: %Author, Title% [pincite] (paren) */
const ACADEMIC_RE = new RegExp(
  String.raw`^(?:(\d+)\s+)?%([^%]+)%\s*(?:(at\s+)?(${PINCITE}))?\s*\(([^)]*)\)\s*\.?\s*$`,
);

/** Practitioner: [vol] Author, *Title* [pincite] (paren) — or *Title* alone (edited). */
const PRACTITIONER_RE = new RegExp(
  String.raw`^(?:(\d+)\s+)?(?:(.+?),\s*)?\*([^*]+)\*\s*(?:(at\s+)?(${PINCITE}))?\s*\(([^)]*)\)\s*\.?\s*$`,
);

/** Unmarked: no typeface markers at all — the title should be italic (R28.2.3). */
const PLAIN_RE = new RegExp(
  String.raw`^(?:(\d+)\s+)?(?:(.+?),\s+)?(.+?)(?:\s+(at\s+)?(${PINCITE}))?\s*\(([^)]*)\)\s*\.?\s*$`,
);

/**
 * Ordinal suffix per Indigo R7.2: "second" and "third" are "2d"/"3d", not
 * "2nd"/"3rd", extrapolated to larger ordinals ending in second/third ("23d").
 * 11th/12th/13th are eleventh/twelfth/thirteenth, so they keep "th".
 */
function ordinalSuffix(n: number): string {
  const last = n % 10;
  const last2 = n % 100;
  if (last === 1 && last2 !== 11) return 'st';
  if (last === 2 && last2 !== 12) return 'd';
  if (last === 3 && last2 !== 13) return 'd';
  return 'th';
}

/** Normalize every ordinal in a parenthetical ("2nd ed." -> "2d ed."). */
function normalizeOrdinals(paren: string): string {
  return paren.replace(/\b(\d+)(st|nd|rd|th|d)\b/g, (_m, digits: string) =>
    `${digits}${ordinalSuffix(Number(digits))}`,
  );
}

interface BookComponents {
  volume?: string;
  /** Author(s) in roman (practitioner). Empty for an edited volume. */
  author: string;
  title: string;
  /** The author+title run as printed, used to round-trip the academic form. */
  smallCapsRun?: string;
  wholeSmallCaps: boolean;
  titleItalic: boolean;
  pincite?: string;
  pinciteHasAt: boolean;
  paren: string;
}

function detect(input: string): number {
  const s = input.trim();
  if (/\sv\.\s|\svs\.\s/.test(s)) return 0.05; // case
  if (REGULATION.test(s)) return 0.05; // regulation: out of v1 scope (PRD 3)
  if (/U\.S\.C\./.test(s)) return 0.05; // statute
  // A section symbol with NO typeface markers is a statute shape, not a book. A
  // book may carry a section pincite (R28.2.4), but then its title is marked up.
  if (/§/.test(s) && !/[*%]/.test(s)) return 0.05;
  // A periodical has "<vol> <journal> <page>" between the title and the year.
  if (/,\s+\d+\s+[^,]+\s+\d+(?:,\s*\d+)?\s*\(\d{4}\)\s*$/.test(s)) return 0.05;
  if (ACADEMIC_RE.test(s) || PRACTITIONER_RE.test(s)) return 0.93;
  // Unmarked form: a real signal, but weaker than a marked one, so other types win
  // when the shape is ambiguous.
  if (PLAIN_RE.test(s)) return 0.55;
  return 0.05;
}

function parse(input: string): ParseResult {
  const s = input.trim();

  const acad = ACADEMIC_RE.exec(s);
  if (acad) {
    const run = acad[2]!.trim();
    let comma = run.indexOf(', ');
    // A suffix after the first comma belongs to the author (R28.2.1).
    while (comma > 0) {
      const next = run.slice(comma + 2).split(', ')[0]?.trim() ?? '';
      if (!NAME_SUFFIX.test(next)) break;
      const nxt = run.indexOf(', ', comma + 2);
      if (nxt < 0) break;
      comma = nxt;
    }
    const components: BookComponents = {
      author: comma > 0 ? run.slice(0, comma).trim() : '',
      title: comma > 0 ? run.slice(comma + 2).trim() : run,
      smallCapsRun: run,
      wholeSmallCaps: true,
      titleItalic: false,
      pinciteHasAt: Boolean(acad[3]),
      paren: acad[5]!.trim(),
      ...(acad[1] ? { volume: acad[1] } : {}),
      ...(acad[4] ? { pincite: acad[4] } : {}),
    };
    return { ok: true, citation: { type: 'book', raw: input, components: components as unknown as Record<string, unknown> } };
  }

  const prac = PRACTITIONER_RE.exec(s);
  if (prac) {
    const components: BookComponents = {
      author: (prac[2] ?? '').trim(),
      title: prac[3]!.trim(),
      wholeSmallCaps: false,
      titleItalic: true,
      pinciteHasAt: Boolean(prac[4]),
      paren: prac[6]!.trim(),
      ...(prac[1] ? { volume: prac[1] } : {}),
      ...(prac[5] ? { pincite: prac[5] } : {}),
    };
    return { ok: true, citation: { type: 'book', raw: input, components: components as unknown as Record<string, unknown> } };
  }

  const plain = PLAIN_RE.exec(s);
  if (plain) {
    const components: BookComponents = {
      author: (plain[2] ?? '').trim(),
      title: plain[3]!.trim(),
      wholeSmallCaps: false,
      titleItalic: false,
      pinciteHasAt: Boolean(plain[4]),
      paren: plain[6]!.trim(),
      ...(plain[1] ? { volume: plain[1] } : {}),
      ...(plain[5] ? { pincite: plain[5] } : {}),
    };
    return { ok: true, citation: { type: 'book', raw: input, components: components as unknown as Record<string, unknown> } };
  }

  return { ok: false, code: 'PARSE_FAIL', message: 'Not a recognized book citation form (R28.1).' };
}

function assemble(c: BookComponents, style: Style): string {
  const vol = c.volume ? `${c.volume} ` : '';
  const pin = c.pincite ? ` ${c.pincite}` : '';
  if (style === 'academic') {
    const run = c.smallCapsRun ?? [c.author, c.title].filter(Boolean).join(', ');
    return `${vol}%${run}%${pin} (${c.paren})`;
  }
  const lead = c.author ? `${c.author}, ` : '';
  return `${vol}${lead}*${c.title}*${pin} (${c.paren})`;
}

function check(parsed: Citation, style: Style): CheckResult {
  const c = parsed.components as unknown as BookComponents;
  const violations: Violation[] = [];

  // --- typeface (R28.2 author roman, R28.2.3 title italic; academic = small caps) ---
  if (style === 'academic' && !c.wholeSmallCaps) {
    violations.push({
      code: 'TYPEFACE',
      message: 'Set the author and title in large-and-small caps (academic convention).',
      rule: 'IB R28.2.3',
      fix: `%${[c.author, c.title].filter(Boolean).join(', ')}%`,
    });
  } else if (style !== 'academic' && !c.titleItalic) {
    violations.push({
      code: 'TYPEFACE',
      message:
        'Italicize the book title and set the author in roman (Indigo R28.2, R28.2.3).',
      rule: 'IB R28.2.3',
      fix: `*${c.title}*`,
    });
  }

  // --- edition ordinals (R7.2): "2nd ed." -> "2d ed." ---
  let paren = c.paren;
  const normalized = normalizeOrdinals(paren);
  if (normalized !== paren) {
    violations.push({
      code: 'ABBREV',
      message: 'Use "2d"/"3d" ordinal forms in citations, not "2nd"/"3rd" (Indigo R7.2).',
      rule: 'IB R7.2',
      fix: normalized,
    });
    paren = normalized;
  }

  // --- R28.2.4: no "at" before the pincite in a full citation ---
  if (c.pinciteHasAt) {
    violations.push({
      code: 'PINCITE',
      message: 'Do not use "at" before the pincite in a full book citation (R28.2.4).',
      rule: 'IB R28.2.4',
      fix: c.pincite ?? '',
    });
  }

  return { pass: violations.length === 0, violations, corrected: assemble({ ...c, paren }, style) };
}

function format(components: CitationInput, style: Style): string {
  const c = components as Partial<BookComponents>;
  return assemble(
    {
      author: String(c.author ?? ''),
      title: String(c.title ?? '').replace(/^\*(.+)\*$/, '$1'),
      wholeSmallCaps: style === 'academic',
      titleItalic: style !== 'academic',
      pinciteHasAt: false,
      paren: String(c.paren ?? ''),
      ...(c.volume ? { volume: String(c.volume) } : {}),
      ...(c.pincite ? { pincite: String(c.pincite) } : {}),
    },
    style,
  );
}

export const bookModule: RuleModule = {
  id: 'book',
  detect,
  parse,
  check,
  format,
};
