/**
 * Engine facade shared by the MCP server and the test harness.
 *
 * Pure and deterministic (PRD Section 6.2). Every result carries a `confidence`
 * of "deterministic" (a registered module handled it) or "unsupported" (no module
 * cleared the detection threshold). BlueRef refuses loudly rather than guessing
 * (PRD Section 6.5): unsupported inputs never receive a best-effort formatted string.
 */
import { DISCLAIMER } from './disclaimer.js';
import * as registry from './registry.js';
import { DEFAULT_STYLE, STYLES } from './types.js';
import { validateIdContext } from './document.js';
import type {
  Citation,
  CitationInput,
  CitationType,
  Confidence,
  ParseResult,
  Style,
  Violation,
} from './types.js';

export interface ParseOutcome {
  confidence: Confidence;
  detectedType: CitationType | null;
  detectionConfidence: number;
  result: ParseResult | null;
  disclaimer: string;
}

export interface CheckOutcome {
  confidence: Confidence;
  detectedType: CitationType | null;
  style: Style;
  pass: boolean;
  violations: Violation[];
  corrected: string;
  disclaimer: string;
}

export interface FormatOutcome {
  confidence: Confidence;
  style: Style;
  output: string | null;
  disclaimer: string;
}

export interface DocumentOutcome {
  summary: {
    total: number;
    supported: number;
    unsupported: number;
    passed: number;
    failed: number;
    contextIssues: number;
  };
  perFootnote: Array<CheckOutcome & { index: number }>;
  disclaimer: string;
}

/**
 * Batch-check an ordered footnote list, then validate short-form context across
 * the sequence (Indigo R15.3.3) — the half a per-citation check cannot see.
 */
export function checkDocument(footnotes: string[], style: Style = DEFAULT_STYLE): DocumentOutcome {
  const perFootnote = footnotes.map((fn, i) => ({
    index: i + 1,
    ...checkCitation(fn, footnotes.slice(0, i), style),
  }));

  // Context violations attach to the footnote that used `id.` incorrectly.
  const issues = validateIdContext(footnotes);
  for (const { index, violation } of issues) {
    const row = perFootnote[index - 1];
    if (!row) continue;
    row.violations = [...row.violations, violation];
    row.pass = false;
  }

  const supported = perFootnote.filter((r) => r.confidence === 'deterministic');
  return {
    summary: {
      total: perFootnote.length,
      supported: supported.length,
      unsupported: perFootnote.length - supported.length,
      passed: supported.filter((r) => r.pass).length,
      failed: supported.filter((r) => !r.pass).length,
      contextIssues: issues.length,
    },
    perFootnote,
    disclaimer: DISCLAIMER,
  };
}

export interface SupportedOutcome {
  supportedTypes: CitationType[];
  styles: Style[];
  defaultStyle: Style;
  limitations: string[];
  disclaimer: string;
}

const LIMITATIONS: string[] = [
  'Two styles: "practitioner" (standard legal documents; the convention The Indigo Book specifies) and "academic" (law-review). Academic typeface is not fully derivable from the CC0 Indigo Book (Indigo R1.2 puts it out of scope) and is treated as secondary.',
  'Short-form CONTEXT is validated only by check_document, which sees the ordered footnotes (Indigo R15.3.3: id. must follow a single-source citation, never a string cite). check_citation alone checks format only, so a short-form pass from check_citation does NOT mean the reference is contextually valid.',
  'Multi-citation input (string cites, subsequent history such as aff\'d or cert. denied) is refused rather than parsed; check each citation separately.',
  '"supra" short forms are not yet handled (they attach mostly to books/periodicals, which have no module yet).',
  'Journal-article support covers consecutively paginated journals (Indigo R30.1.1) and student-written material (R30.1.3). Magazines and newspapers with standard pagination (R30.1.2 — full date and "at <page>" instead of a volume) are not yet handled.',
  'Journal title abbreviations are open-ended: R30.3.1 abbreviates by rule and R30.2.2 allows discretion where a journal names its own abbreviation, so an unrecognized journal abbreviation is accepted rather than flagged. Only a known spelled-out title is flagged.',
  'No foreign, international, or treaty citations.',
  'No legislative history, regulations, or administrative materials beyond basic statutory codes.',
  'Format checking only: does not verify that a source exists, is quoted accurately, or supports the proposition cited.',
  'Unsupported inputs are refused (confidence "unsupported"), never guessed.',
];

export function parseCitation(input: string): ParseOutcome {
  const d = registry.detect(input);
  if (!d.supported || !d.module) {
    return {
      confidence: 'unsupported',
      detectedType: null,
      detectionConfidence: d.confidence,
      result: null,
      disclaimer: DISCLAIMER,
    };
  }
  return {
    confidence: 'deterministic',
    detectedType: d.type,
    detectionConfidence: d.confidence,
    result: d.module.parse(input),
    disclaimer: DISCLAIMER,
  };
}

export function checkCitation(
  input: string,
  _context?: string[],
  style: Style = DEFAULT_STYLE,
): CheckOutcome {
  const d = registry.detect(input);
  if (!d.supported || !d.module) {
    return {
      confidence: 'unsupported',
      detectedType: null,
      style,
      pass: false,
      violations: [],
      corrected: input,
      disclaimer: DISCLAIMER,
    };
  }
  const parsed = d.module.parse(input);
  if (!parsed.ok) {
    return {
      confidence: 'deterministic',
      detectedType: d.type,
      style,
      pass: false,
      violations: [
        { code: parsed.code, message: parsed.message, rule: '', fix: '' },
      ],
      corrected: input,
      disclaimer: DISCLAIMER,
    };
  }
  const citation: Citation = parsed.citation;
  const result = d.module.check(citation, style);
  return {
    confidence: 'deterministic',
    detectedType: d.type,
    style,
    pass: result.pass,
    violations: result.violations,
    corrected: result.corrected,
    disclaimer: DISCLAIMER,
  };
}

export function formatCitation(
  components: CitationInput,
  type: string,
  style: Style = DEFAULT_STYLE,
): FormatOutcome {
  const out = registry.hasType(type as CitationType)
    ? registry.format(type as CitationType, components, style)
    : null;
  if (out === null) {
    return { confidence: 'unsupported', style, output: null, disclaimer: DISCLAIMER };
  }
  return { confidence: 'deterministic', style, output: out, disclaimer: DISCLAIMER };
}

export function listSupported(): SupportedOutcome {
  return {
    supportedTypes: registry.supportedTypes(),
    styles: [...STYLES],
    defaultStyle: DEFAULT_STYLE,
    limitations: LIMITATIONS,
    disclaimer: DISCLAIMER,
  };
}
