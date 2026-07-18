/**
 * The single source of truth for the BlueRef disclaimer (PRD Section 4.3).
 *
 * This string ships in the README and in the `disclaimer` field of every tool
 * response. Do not fork or paraphrase it; import this constant everywhere the
 * disclaimer is needed.
 */
export const DISCLAIMER =
  'BlueRef is an independent open-source project. It is not affiliated with, ' +
  'endorsed by, or a substitute for The Bluebook or any citation authority. It ' +
  'checks citation format only. It does not verify that sources exist, are quoted ' +
  'accurately, or support the propositions cited. Output should be reviewed by a ' +
  'human before use in academic or legal work. This is not legal advice.';
