/**
 * Shared interfaces for the BlueRef deterministic citation engine.
 *
 * Everything here is data-only. The engine performs no LLM calls and no network
 * I/O (PRD Section 6.2). Rule modules depend only on this file and on data
 * tables under `src/data` (PRD Section 12).
 */

/** Supported citation type identifiers. Extended as new RuleModules are added. */
export type CitationType = 'case' | 'statute' | 'periodical' | 'book' | 'shortform';

/**
 * The failure taxonomy (PRD Section 7.5). Every checker violation carries exactly
 * one of these codes so CI can report accuracy per code and weak areas stay visible.
 */
export type ErrorCode =
  | 'PARSE_FAIL'
  | 'TYPE_MISDETECT'
  | 'ABBREV'
  | 'TYPEFACE'
  | 'ORDERING'
  | 'PINCITE'
  | 'PUNCTUATION'
  | 'SPACING'
  | 'DATE_COURT'
  | 'SHORTFORM_CONTEXT'
  | 'SPURIOUS_FLAG';

export const ERROR_CODES: readonly ErrorCode[] = [
  'PARSE_FAIL',
  'TYPE_MISDETECT',
  'ABBREV',
  'TYPEFACE',
  'ORDERING',
  'PINCITE',
  'PUNCTUATION',
  'SPACING',
  'DATE_COURT',
  'SHORTFORM_CONTEXT',
  'SPURIOUS_FLAG',
];

/** Confidence label attached to every tool response (PRD Section 6.5). */
export type Confidence = 'deterministic' | 'unsupported';

/**
 * Citation style / typeface convention.
 *
 * - `practitioner`: standard legal documents (briefs, motions, memoranda). This
 *   is the convention The Indigo Book (CC0) actually specifies: case names and
 *   titles italicized, journals in roman (Indigo R2.1). Fully CC0-derivable.
 * - `academic`: law-review articles (large-and-small caps for journals/books,
 *   roman full-cite case names). The Indigo Book puts a full treatment of this
 *   OUT OF SCOPE (Indigo R1.2), so academic typeface details are not derivable
 *   from our CC0 source and are treated as a secondary style.
 */
export type Style = 'academic' | 'practitioner';

export const STYLES: readonly Style[] = ['academic', 'practitioner'];

/** Default style until the primary-style decision is finalized. */
export const DEFAULT_STYLE: Style = 'academic';

/**
 * A structured citation. Component fields are type-specific and intentionally
 * open; each RuleModule documents and populates the fields it uses. `raw` is the
 * original input; `type` is the detected/declared citation type.
 */
export interface Citation {
  type: CitationType;
  raw: string;
  /** Structured, type-specific components (e.g. reporter, volume, page). */
  components: Record<string, unknown>;
}

/** Result of parsing an input string into structured components. */
export type ParseResult =
  | { ok: true; citation: Citation }
  | { ok: false; code: 'PARSE_FAIL' | 'TYPE_MISDETECT'; message: string };

/** A single detected formatting violation. */
export interface Violation {
  /** Error code from the failure taxonomy (PRD Section 7.5). */
  code: ErrorCode;
  /** Human-readable explanation of what is wrong. */
  message: string;
  /** Indigo Book rule reference(s), e.g. "IB R11.2", "IB T7". */
  rule: string;
  /** The corrected fragment for this specific violation. */
  fix: string;
}

/** Result of checking a citation for formatting violations. */
export interface CheckResult {
  /** True when no violations were found. */
  pass: boolean;
  violations: Violation[];
  /** The fully corrected canonical citation (markers per PRD 7.4). */
  corrected: string;
}

/** Structured input to the formatter (mirrors `Citation.components`). */
export type CitationInput = Record<string, unknown>;

/**
 * The extensibility contract (PRD Section 6.4). Every citation type implements
 * this one interface and registers itself in `registry.ts`. No cross-module
 * imports are permitted except this file and shared data tables.
 */
export interface RuleModule {
  /** Stable type id. */
  id: CitationType;
  /** Confidence in [0, 1] that `input` is this citation type. */
  detect(input: string): number;
  /** Parse into structured components or a typed failure. */
  parse(input: string): ParseResult;
  /** Check a parsed citation under the given style, returning violations. */
  check(parsed: Citation, style: Style): CheckResult;
  /** Build a canonical citation string from components under the given style. */
  format(components: CitationInput, style: Style): string;
}
