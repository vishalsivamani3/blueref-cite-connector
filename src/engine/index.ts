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

export interface SupportedOutcome {
  supportedTypes: CitationType[];
  styles: Style[];
  defaultStyle: Style;
  limitations: string[];
  disclaimer: string;
}

const LIMITATIONS: string[] = [
  'Two styles: "practitioner" (standard legal documents; the convention The Indigo Book specifies) and "academic" (law-review). Academic typeface is not fully derivable from the CC0 Indigo Book (Indigo R1.2 puts it out of scope) and is treated as secondary.',
  'Short forms (id., case short cites) are checked for FORMAT only (Indigo R15). Whether an "id." actually refers to the right authority is a context question (R15.3.3 forbids id. after a string cite or an ambiguous reference) and needs the ordered preceding footnotes — that is check_document, not yet implemented. A short-form format pass does NOT mean the reference is contextually valid.',
  'Multi-citation input (string cites, subsequent history such as aff\'d or cert. denied) is refused rather than parsed; check each citation separately.',
  '"supra" short forms are not yet handled (they attach mostly to books/periodicals, which have no module yet).',
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
