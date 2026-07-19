/**
 * Periodical (journal article) rule module — Indigo Book 2.0 R30, R2.1.
 *
 * R30.1.1, consecutively paginated journals (the law-review form):
 *   <Author>, <Italicized Title>, <volume> <Publication, abbreviated> <first page>,
 *   <pincite> (<year>)
 *   e.g. "Liz Brown, Bridging the Gap: …, 3 N.Y.U. J. Intell. Prop. & Ent. L. 310, 351 (2014)"
 *
 * R30.1.3, student-written material carries a designation after the author:
 *   "Amanda Levendowski, Note, Using Copyright to Combat Revenge Porn, 3 N.Y.U. …"
 *   Unsigned pieces begin with the designation: "Comment, Law and Lawns: …"
 *
 * TYPEFACE, and the one place this module branches on style:
 *   - The article title is ALWAYS italicized (R2.1, R30.1.1 "<Italicized Title>").
 *   - The journal name is ROMAN under the Indigo/practitioner convention — see the
 *     R30.1.1 example above and the R2.1 example ("128 Harv. L. Rev. 540, 544").
 *   - Under the academic convention the journal is in large-and-small caps. Indigo
 *     places academic typeface out of scope (R1.2), but a pre-AI law review in the
 *     back-test corroborates it, so `academic` keeps the %small caps% markers.
 *
 * JOURNAL NAMES ARE OPEN-ENDED. R30.3.1 abbreviates by *rule* (Tables T15/T11/T12)
 * and R30.2.2 adds "use discretion … when the journal identifies its own abbreviated
 * title differently". There is no closed list, so an unrecognized journal
 * abbreviation is ACCEPTED, never flagged — flagging would produce spurious errors
 * on the majority of real citations. Only a *known spelled-out* title (present in
 * the data table's `full` field) is flagged as needing abbreviation.
 *
 * Not yet handled: R30.1.2 magazines/newspapers with standard pagination, which use
 * a full date and "at <page>" instead of a volume. Reported in list_supported.
 *
 * Self-contained per PRD Section 12: shared types and data tables only.
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
import periodicalsData from '../../data/periodicals.json' with { type: 'json' };

type TableEntry = { full: string; variants: string[] };
const PERIODICALS = periodicalsData.periodicals as Record<string, TableEntry>;

/** full/spelled-out journal title -> canonical abbreviation (R30.3.1). */
const SPELLED_OUT = new Map<string, string>();
for (const [abbrev, entry] of Object.entries(PERIODICALS)) {
  SPELLED_OUT.set(entry.full.toLowerCase(), abbrev);
  for (const v of entry.variants) SPELLED_OUT.set(v.toLowerCase(), abbrev);
}

/** Student-work designations (R30.1.3). */
const DESIGNATION = /^(Note|Comment|Essay|Book Note|Book Review|Recent Case|Recent Development)$/i;

/**
 * Tail of the citation: , <vol> <journal> <page>[, <pincite>] (<year>)
 * The journal is deliberately permissive (see the open-ended note above).
 */
const TAIL_RE =
  /,\s+(\d+)\s+(%[^%]+%|[^,]+?)\s+(\d+)(?:,\s*(at\s+)?(\d+(?:[-–]\d+)?))?\s*\((\d{4})\)\s*\.?\s*$/;

interface PeriodicalComponents {
  author: string;
  designation?: string;
  title: string;
  titleItalic: boolean;
  volume: string;
  journal: string;
  journalSmallCaps: boolean;
  page: string;
  pincite?: string;
  /** true when the input wrongly used "at" before the pincite (R30.1.1) */
  pinciteHasAt?: boolean;
  year: string;
}

function detect(input: string): number {
  const s = input.trim();
  if (/\sv\.\s|\svs\.\s/.test(s)) return 0.05; // a case
  if (/§/.test(s)) return 0.05; // a statute
  if (!TAIL_RE.test(s)) return 0.05;
  // An italicized title or a small-caps journal is a strong periodical signal.
  if (/\*[^*]+\*/.test(s) || /%[^%]+%/.test(s)) return 0.94;
  return 0.6;
}

function parse(input: string): ParseResult {
  const s = input.trim();
  const tail = TAIL_RE.exec(s);
  if (!tail) {
    return { ok: false, code: 'PARSE_FAIL', message: 'Not a recognized journal-article form (R30.1.1).' };
  }
  const head = s.slice(0, tail.index).trim();
  if (!head) return { ok: false, code: 'PARSE_FAIL', message: 'Missing author and article title.' };

  let author = '';
  let designation: string | undefined;
  let title: string;
  let titleItalic = false;

  const ital = /\*([^*]+)\*/.exec(head);
  if (ital) {
    titleItalic = true;
    title = ital[1]!.trim();
    const before = head.slice(0, ital.index).replace(/,\s*$/, '').trim();
    const parts = before.split(/,\s*/).filter(Boolean);
    if (parts.length && DESIGNATION.test(parts[parts.length - 1]!)) {
      designation = parts.pop();
    }
    author = parts.join(', ');
  } else {
    // No italics: split the author off at the first comma, then an optional
    // designation. The remainder is the title (titles themselves contain commas).
    const parts = head.split(/,\s*/);
    if (DESIGNATION.test(parts[0] ?? '')) {
      designation = parts.shift();
      author = '';
    } else {
      author = (parts.shift() ?? '').trim();
      if (parts.length > 1 && DESIGNATION.test(parts[0] ?? '')) designation = parts.shift();
    }
    title = parts.join(', ').trim();
  }
  if (!title) return { ok: false, code: 'PARSE_FAIL', message: 'Missing article title.' };

  const journalRaw = tail[2]!.trim();
  const journalSmallCaps = /^%.+%$/.test(journalRaw);
  const components: PeriodicalComponents = {
    author,
    title,
    titleItalic,
    volume: tail[1]!,
    journal: journalSmallCaps ? journalRaw.slice(1, -1).trim() : journalRaw,
    journalSmallCaps,
    page: tail[3]!,
    year: tail[6]!,
    pinciteHasAt: Boolean(tail[4]),
    ...(designation ? { designation } : {}),
    ...(tail[5] ? { pincite: tail[5] } : {}),
  };
  return {
    ok: true,
    citation: { type: 'periodical', raw: input, components: components as unknown as Record<string, unknown> },
  };
}

function assemble(c: PeriodicalComponents, style: Style): string {
  const journal = style === 'academic' ? `%${c.journal}%` : c.journal;
  const lead = [c.author, c.designation].filter(Boolean).join(', ');
  const pin = c.pincite ? `, ${c.pincite}` : '';
  return `${lead ? lead + ', ' : ''}*${c.title}*, ${c.volume} ${journal} ${c.page}${pin} (${c.year})`;
}

function check(parsed: Citation, style: Style): CheckResult {
  const c = parsed.components as unknown as PeriodicalComponents;
  const violations: Violation[] = [];

  // --- article title is always italicized (R2.1, R30.1.1) ---
  if (!c.titleItalic) {
    violations.push({
      code: 'TYPEFACE',
      message: 'Italicize the article title (Indigo R30.1.1, R2.1).',
      rule: 'IB R2.1',
      fix: `*${c.title}*`,
    });
  }

  // --- journal abbreviation (R30.3.1); unknown abbreviations are accepted ---
  let journal = c.journal;
  const canonical = SPELLED_OUT.get(journal.toLowerCase());
  if (canonical && canonical !== journal) {
    violations.push({
      code: 'ABBREV',
      message: `Abbreviate the journal title: "${journal}" should be "${canonical}" (R30.3.1).`,
      rule: 'IB R30.3.1',
      fix: canonical,
    });
    journal = canonical;
  }

  // --- journal typeface: roman under practitioner, small caps under academic ---
  const wantSmallCaps = style === 'academic';
  if (c.journalSmallCaps !== wantSmallCaps) {
    violations.push({
      code: 'TYPEFACE',
      message: wantSmallCaps
        ? 'Set the journal name in large-and-small caps (academic convention).'
        : 'The journal name is roman, not small caps (Indigo R30.1.1).',
      rule: wantSmallCaps ? 'IB R30.1.1' : 'IB R30.1.1',
      fix: wantSmallCaps ? `%${journal}%` : journal,
    });
  }

  // R30.1.1 gives "<first page>, <pincite>" — no "at" for consecutively
  // paginated journals ("at" belongs to R30.1.2 standard pagination).
  if (c.pinciteHasAt) {
    violations.push({
      code: 'PINCITE',
      message: 'Drop "at" before the pincite in a consecutively paginated journal cite (R30.1.1).',
      rule: 'IB R30.1.1',
      fix: c.pincite ?? '',
    });
  }

  const corrected = assemble({ ...c, journal }, style);
  return { pass: violations.length === 0, violations, corrected };
}

function format(components: CitationInput, style: Style): string {
  const c = components as Partial<PeriodicalComponents>;
  return assemble(
    {
      author: String(c.author ?? ''),
      title: String(c.title ?? '').replace(/^\*(.+)\*$/, '$1'),
      titleItalic: true,
      volume: String(c.volume ?? ''),
      journal: String(c.journal ?? '').replace(/^%(.+)%$/, '$1'),
      journalSmallCaps: style === 'academic',
      page: String(c.page ?? ''),
      year: String(c.year ?? ''),
      ...(c.designation ? { designation: String(c.designation) } : {}),
      ...(c.pincite ? { pincite: String(c.pincite) } : {}),
    },
    style,
  );
}

export const periodicalModule: RuleModule = {
  id: 'periodical',
  detect,
  parse,
  check,
  format,
};
