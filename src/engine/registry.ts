/**
 * Rule module registry and dispatch (PRD Section 6.3).
 *
 * Adding a citation type is a one-line change here plus one module file plus data
 * tables plus corpus entries (PRD Section 6.4, 8). The server core never changes.
 *
 * NOTE (Phase 0): no RuleModule is registered yet. Per PRD Section 7.1, no file
 * may exist in `src/engine/rules/` until the harness runs and reports accuracy
 * against the corpus. Rule modules are added in Phases 1-3 and pushed here.
 */
import type {
  Citation,
  CitationInput,
  CitationType,
  CheckResult,
  ParseResult,
  RuleModule,
} from './types.js';

/**
 * Minimum detection confidence for an input to be treated as a supported type.
 * Below this, BlueRef refuses loudly (`unsupported`) rather than guessing
 * (PRD Section 6.5).
 */
export const DETECT_THRESHOLD = 0.5;

/**
 * Registered rule modules. Empty in Phase 0. To add a type:
 *   import { caseModule } from './rules/cases.js';
 *   ... and add it to this array.
 */
const MODULES: RuleModule[] = [];

/** All supported citation type ids, derived from the registered modules. */
export function supportedTypes(): CitationType[] {
  return MODULES.map((m) => m.id);
}

/** True if any module is registered for the given type id. */
export function hasType(type: CitationType): boolean {
  return MODULES.some((m) => m.id === type);
}

export interface Detection {
  module: RuleModule | null;
  type: CitationType | null;
  confidence: number;
  supported: boolean;
}

/**
 * Detect the most likely citation type for `input`. Returns the highest-confidence
 * module at or above {@link DETECT_THRESHOLD}, or an unsupported detection.
 */
export function detect(input: string): Detection {
  let best: RuleModule | null = null;
  let bestScore = 0;
  for (const m of MODULES) {
    const score = m.detect(input);
    if (score > bestScore) {
      best = m;
      bestScore = score;
    }
  }
  const supported = best !== null && bestScore >= DETECT_THRESHOLD;
  return {
    module: supported ? best : null,
    type: supported ? best!.id : null,
    confidence: bestScore,
    supported,
  };
}

/** Get the module for an explicit type id, or null if none is registered. */
export function moduleFor(type: CitationType): RuleModule | null {
  return MODULES.find((m) => m.id === type) ?? null;
}

/** Convenience dispatch wrappers used by the server layer. */
export function parse(input: string): ParseResult {
  const d = detect(input);
  if (!d.module) {
    return {
      ok: false,
      code: 'TYPE_MISDETECT',
      message: 'No supported citation type detected for this input.',
    };
  }
  return d.module.parse(input);
}

export function check(citation: Citation): CheckResult {
  const m = moduleFor(citation.type);
  if (!m) {
    return {
      pass: false,
      violations: [
        {
          code: 'TYPE_MISDETECT',
          message: `No rule module registered for type "${citation.type}".`,
          rule: '',
          fix: '',
        },
      ],
      corrected: citation.raw,
    };
  }
  return m.check(citation);
}

export function format(type: CitationType, components: CitationInput): string | null {
  const m = moduleFor(type);
  return m ? m.format(components) : null;
}
