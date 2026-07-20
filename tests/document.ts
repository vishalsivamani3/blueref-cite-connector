/**
 * Document-level short-form context tests (Indigo R15.3.3).
 *
 * The corpus harness checks one citation at a time and therefore cannot express
 * "this `id.` is wrong given what precedes it". These scenarios cover that, and
 * are run in CI alongside the corpus.
 *
 * The first three cases are the Indigo Book's own Correct/Incorrect examples.
 *
 * Run: `npm run test:document`
 */
import { checkDocument } from '../src/engine/index.js';

interface Scenario {
  label: string;
  footnotes: string[];
  /** 1-based footnote indexes expected to carry a SHORTFORM_CONTEXT violation. */
  expectContextIssuesAt: number[];
}

const NAKED_COWBOY = '*Naked Cowboy v. CBS*, 844 F. Supp. 2d 510, 517-18 (S.D.N.Y. 2012)';
const HORMEL = '*Hormel Foods Corp. v. Jim Henson Prods., Inc.*, 73 F.3d 497, 504 (2d Cir. 1996)';

const SCENARIOS: Scenario[] = [
  {
    label: 'R15.3.3 Correct — id. after a citation to a single source',
    footnotes: [NAKED_COWBOY, '*Id.*'],
    expectContextIssuesAt: [],
  },
  {
    label: 'R15.3.3 Incorrect — id. after a string citation of two sources',
    footnotes: [`${HORMEL}; ${NAKED_COWBOY}`, '*Id.*'],
    expectContextIssuesAt: [2],
  },
  {
    label: 'R15.3.3 Correct — short form (not id.) after a string citation',
    footnotes: [`${HORMEL}; ${NAKED_COWBOY}`, '*Naked Cowboy*, 844 F. Supp. 2d at 517-18'],
    expectContextIssuesAt: [],
  },
  {
    label: 'id. with no preceding citation',
    footnotes: ['*Id.* at 5'],
    expectContextIssuesAt: [1],
  },
  {
    label: 'id. may chain after another id. (same single source)',
    footnotes: [NAKED_COWBOY, '*Id.*', '*Id.* at 518'],
    expectContextIssuesAt: [],
  },
  {
    label: 'R15.3.3 exception — a citation inside a parenthetical does not foreclose id.',
    footnotes: [
      '*Calcano v. Swarovski N. Am. Ltd.*, 36 F.4th 68, 74 (2d Cir. 2022) (citing *Kreisler v. Second Ave. Diner Corp.*, 731 F.3d 184, 187 (2d Cir. 2013))',
      '*Id.*',
    ],
    expectContextIssuesAt: [],
  },
  {
    label: 'id. after a three-source string citation is still forbidden',
    footnotes: [
      `${HORMEL}; ${NAKED_COWBOY}; *Washington v. Davis*, 426 U.S. 229, 239-40 (1976)`,
      '*Id.*',
    ],
    expectContextIssuesAt: [2],
  },
  {
    label: 'R29.2 supra pointing back to an earlier footnote',
    footnotes: ['a', 'b', 'c', 'd', NAKED_COWBOY, 'f', 'g', 'Cowboy, *supra* note 5, at 517'],
    expectContextIssuesAt: [],
  },
  {
    label: 'R29.2 supra pointing at its own footnote number',
    footnotes: ['a', 'b', 'Skinner, *supra* note 3, at 541'],
    expectContextIssuesAt: [3],
  },
  {
    label: 'R29.2 supra pointing forward to a later footnote',
    footnotes: ['a', 'Skinner, *supra* note 9, at 541'],
    expectContextIssuesAt: [2],
  },
];

let failures = 0;
for (const s of SCENARIOS) {
  const result = checkDocument(s.footnotes, 'practitioner');
  const got = result.perFootnote
    .filter((f) => f.violations.some((v) => v.code === 'SHORTFORM_CONTEXT'))
    .map((f) => f.index);
  const want = s.expectContextIssuesAt;
  const ok = got.length === want.length && got.every((n, i) => n === want[i]);
  if (!ok) {
    failures++;
    console.error(`FAIL  ${s.label}`);
    console.error(`        expected context issues at [${want.join(', ')}], got [${got.join(', ')}]`);
  } else {
    console.log(`ok    ${s.label}`);
  }
}

console.log(`\n${SCENARIOS.length - failures}/${SCENARIOS.length} document context scenarios passed`);
if (failures) process.exit(1);
