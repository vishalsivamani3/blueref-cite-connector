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
import type {
  Citation,
  CitationInput,
  CitationType,
  Confidence,
  ParseResult,
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
  pass: boolean;
  violations: Violation[];
  corrected: string;
  disclaimer: string;
}

export interface FormatOutcome {
  confidence: Confidence;
  output: string | null;
  disclaimer: string;
}

export interface SupportedOutcome {
  supportedTypes: CitationType[];
  limitations: string[];
  disclaimer: string;
}

const LIMITATIONS: string[] = [
  'Academic (Indigo Book-derived) citation format only; not Bluepages/court-document format.',
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

export function checkCitation(input: string, _context?: string[]): CheckOutcome {
  const d = registry.detect(input);
  if (!d.supported || !d.module) {
    return {
      confidence: 'unsupported',
      detectedType: null,
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
      pass: false,
      violations: [
        { code: parsed.code, message: parsed.message, rule: '', fix: '' },
      ],
      corrected: input,
      disclaimer: DISCLAIMER,
    };
  }
  const citation: Citation = parsed.citation;
  const result = d.module.check(citation);
  return {
    confidence: 'deterministic',
    detectedType: d.type,
    pass: result.pass,
    violations: result.violations,
    corrected: result.corrected,
    disclaimer: DISCLAIMER,
  };
}

export function formatCitation(components: CitationInput, type: string): FormatOutcome {
  const out = registry.hasType(type as CitationType)
    ? registry.format(type as CitationType, components)
    : null;
  if (out === null) {
    return { confidence: 'unsupported', output: null, disclaimer: DISCLAIMER };
  }
  return { confidence: 'deterministic', output: out, disclaimer: DISCLAIMER };
}

export function listSupported(): SupportedOutcome {
  return {
    supportedTypes: registry.supportedTypes(),
    limitations: LIMITATIONS,
    disclaimer: DISCLAIMER,
  };
}
