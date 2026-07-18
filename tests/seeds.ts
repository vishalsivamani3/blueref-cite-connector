/**
 * Clean canonical seed citations, hand-authored for Phase 0.
 *
 * Per PRD Section 12, every entry Claude Code produces is `provenance: "synthetic"`
 * and subject to human spot-check against the Indigo Book. These seeds are the
 * "clean canonical" 50% bucket (PRD Section 7.3); the generator derives
 * single-error and multi-error entries from them by scripted mutation.
 *
 * Typeface markers: `*italic*`, `%small caps%` (PRD Section 7.4).
 */
import type { CitationType, ErrorCode, Style } from '../src/engine/types.js';

export interface Seed {
  type: CitationType;
  /** Clean, canonical citation string (with typeface markers where applicable). */
  citation: string;
  /** Indigo Book rule reference(s) the clean form exercises. */
  rules: string[];
  /** Citation style. Omitted = academic (the current default). */
  style?: Style;
  notes?: string;
}

/**
 * Adversarial entries (PRD Section 7.3's 15% bucket): inputs stated outright with
 * their expected outcome, rather than derived from a clean seed by mutation.
 *
 * These pin behaviour that is not a "correct this citation" case — chiefly that
 * BlueRef *refuses loudly* on constructs it does not model, instead of silently
 * mis-parsing them and reporting a confident pass (PRD Sections 6.5, 11.1).
 */
export interface Adversarial {
  type: CitationType;
  input: string;
  expected_violations: ErrorCode[];
  /** What the tool should return; for a refusal this is the input, uncorrected. */
  expected_output: string;
  rules: string[];
  style?: Style;
  notes: string;
}

export const ADVERSARIAL: Adversarial[] = [
  // Subsequent history / string cites. Before the strict-parse fix these all
  // reassembled to the identical string and reported pass:true with zero
  // violations, having swallowed a whole citation into the "case name".
  {
    type: 'case',
    input: "Grutter v. Bollinger, 288 F.3d 732, 740 (6th Cir. 2002), aff'd, 539 U.S. 306 (2003)",
    expected_violations: ['PARSE_FAIL'],
    expected_output: "Grutter v. Bollinger, 288 F.3d 732, 740 (6th Cir. 2002), aff'd, 539 U.S. 306 (2003)",
    rules: ['IB R11', 'IB R2.1'],
    notes: 'subsequent history (aff\'d): refuse, do not silently mis-parse',
  },
  {
    type: 'case',
    input: 'Doe v. Roe, 123 F.3d 456, 460 (7th Cir. 1999), cert. denied, 528 U.S. 1002 (1999)',
    expected_violations: ['PARSE_FAIL'],
    expected_output: 'Doe v. Roe, 123 F.3d 456, 460 (7th Cir. 1999), cert. denied, 528 U.S. 1002 (1999)',
    rules: ['IB R11', 'IB R2.1'],
    notes: 'subsequent history (cert. denied): refuse, do not silently mis-parse',
  },
  {
    type: 'case',
    input: 'Smith v. Jones, 123 F.3d 456 (7th Cir. 1999); Doe v. Roe, 456 F.3d 789 (8th Cir. 2000)',
    expected_violations: ['PARSE_FAIL'],
    expected_output: 'Smith v. Jones, 123 F.3d 456 (7th Cir. 1999); Doe v. Roe, 456 F.3d 789 (8th Cir. 2000)',
    rules: ['IB R11'],
    notes: 'string cite (two citations): refuse, check each separately',
  },
  {
    type: 'case',
    input: "United States v. Doe, 123 F.3d 456, 460 (7th Cir. 1999), rev'd, 530 U.S. 100 (2000)",
    expected_violations: ['PARSE_FAIL'],
    expected_output: "United States v. Doe, 123 F.3d 456, 460 (7th Cir. 1999), rev'd, 530 U.S. 100 (2000)",
    rules: ['IB R11', 'IB R2.1'],
    notes: 'subsequent history (rev\'d): refuse, do not silently mis-parse',
  },
];

export const SEEDS: Seed[] = [
  // ------------------------------------------------------------------ cases
  { type: 'case', citation: 'Smith v. Jones, 123 F.3d 456, 460 (7th Cir. 1999)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'United States v. Hayes, 219 F.3d 449, 452 (5th Cir. 2000)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'Doe v. Univ. of Mich., 78 F.3d 1113, 1120 (6th Cir. 1996)', rules: ['IB R11', 'IB R11.3.1', 'IB R12.2'] },
  { type: 'case', citation: 'ACLU v. Reno, 217 F.3d 162, 173 (3d Cir. 2000)', rules: ['IB R11', 'IB R12.2'] },
  { type: 'case', citation: 'Nken v. Holder, 556 F.3d 1028, 1032 (D.C. Cir. 2009)', rules: ['IB R11', 'IB R12.2'] },
  { type: 'case', citation: 'Garcia v. City of L.A., 213 F.3d 1113, 1118 (9th Cir. 2000)', rules: ['IB R11', 'IB R12.2', 'IB R11.3.2'] },
  { type: 'case', citation: 'Doe v. Roe, 123 F. Supp. 2d 456, 460 (S.D.N.Y. 2000)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'Palsgraf v. Long Island R.R. Co., 162 N.E. 99, 100 (N.Y. 1928)', rules: ['IB R11', 'IB R11.3.1', 'IB R12.2'] },
  { type: 'case', citation: 'MacPherson v. Buick Motor Co., 111 N.E. 1050, 1053 (N.Y. 1916)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Brown v. Bd. of Educ., 347 U.S. 483, 495 (1954)', rules: ['IB R11', 'IB T1', 'IB R11.3.1'] },
  { type: 'case', citation: 'Miranda v. Arizona, 384 U.S. 436, 444 (1966)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'United States v. Nixon, 418 U.S. 683, 705 (1974)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Gideon v. Wainwright, 372 U.S. 335, 344 (1963)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Mapp v. Ohio, 367 U.S. 643, 655 (1961)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Katz v. United States, 389 U.S. 347, 351 (1967)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Terry v. Ohio, 392 U.S. 1, 20 (1968)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Grutter v. Bollinger, 539 U.S. 306, 325 (2003)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Int\'l Shoe Co. v. Washington, 326 U.S. 310, 316 (1945)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Ashcroft v. Iqbal, 556 U.S. 662, 678 (2009)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Bell Atl. Corp. v. Twombly, 550 U.S. 544, 570 (2007)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Erie R.R. Co. v. Tompkins, 304 U.S. 64, 78 (1938)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Lochner v. New York, 198 U.S. 45, 53 (1905)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'United States v. Microsoft Corp., 253 F.3d 34, 46 (D.C. Cir. 2001)', rules: ['IB R11', 'IB T1', 'IB R11.3.1', 'IB R12.2'] },
  { type: 'case', citation: 'Whitman v. Am. Trucking Ass\'ns, 531 U.S. 457, 465 (2001)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'NLRB v. Jones & Laughlin Steel Corp., 301 U.S. 1, 30 (1937)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Youngstown Sheet & Tube Co. v. Sawyer, 343 U.S. 579, 587 (1952)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'SEC v. W.J. Howey Co., 328 U.S. 293, 298 (1946)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Feist Publ\'ns, Inc. v. Rural Tel. Serv. Co., 499 U.S. 340, 345 (1991)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Sony Corp. of Am. v. Universal City Studios, Inc., 464 U.S. 417, 420 (1984)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Perez v. Mortg. Bankers Ass\'n, 575 U.S. 92, 96 (2015)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'United States v. Jones, 565 U.S. 400, 404 (2012)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Riley v. California, 573 U.S. 373, 385 (2014)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Obergefell v. Hodges, 576 U.S. 644, 675 (2015)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Katzenbach v. McClung, 379 U.S. 294, 300 (1964)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Johnson v. Transp. Agency, 480 U.S. 616, 620 (1987)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Van Orden v. Perry, 545 U.S. 677, 690 (2005)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Hurley v. Irish-Am. Grp., 515 U.S. 557, 560 (1995)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'United States v. Va., 518 U.S. 515, 531 (1996)', rules: ['IB R11', 'IB R11.3.2'] },
  { type: 'case', citation: 'Kelo v. City of New London, 545 U.S. 469, 477 (2005)', rules: ['IB R11', 'IB T1'] },
  // Federal circuit (F. / F.2d / F.3d)
  { type: 'case', citation: 'Hickman v. Taylor, 153 F.2d 212, 223 (3d Cir. 1945)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'United States v. Carroll Towing Co., 159 F.2d 169, 173 (2d Cir. 1947)', rules: ['IB R11', 'IB R11.3.1', 'IB R12.2'] },
  { type: 'case', citation: 'Bivens v. Six Unknown Named Agents, 456 F.2d 1339, 1343 (2d Cir. 1972)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'Frye v. United States, 293 F. 1013, 1014 (D.C. Cir. 1923)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'United States v. Alvarez, 638 F.3d 666, 670 (9th Cir. 2011)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'Katz v. Dole, 709 F.2d 251, 254 (4th Cir. 1983)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'United States v. Dennis, 183 F.2d 201, 207 (2d Cir. 1950)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  // Federal district (F. Supp. / F. Supp. 2d)
  { type: 'case', citation: 'United States v. Doe, 465 F. Supp. 2d 100, 105 (S.D.N.Y. 2006)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'Roe v. Doe Corp., 321 F. Supp. 2d 456, 460 (D. Mass. 2004)', rules: ['IB R11', 'IB R11.3.1', 'IB R12.2'] },
  { type: 'case', citation: 'Smith v. Barnhart, 293 F. Supp. 2d 252, 256 (E.D. Pa. 2003)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'Doe v. Reno, 78 F. Supp. 1113, 1120 (N.D. Cal. 1999)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  // U.S. Supreme Court (U.S. reporter)
  { type: 'case', citation: 'In re Winship, 397 U.S. 358, 364 (1970)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'United States v. Leon, 468 U.S. 897, 906 (1984)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Chimel v. California, 395 U.S. 752, 762 (1969)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Gregg v. Georgia, 428 U.S. 153, 169 (1976)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Batson v. Kentucky, 476 U.S. 79, 89 (1986)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Gonzales v. Raich, 545 U.S. 1, 9 (2005)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Wickard v. Filburn, 317 U.S. 111, 128 (1942)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Heart of Atlanta Motel, Inc. v. United States, 379 U.S. 241, 258 (1964)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'District of Columbia v. Heller, 554 U.S. 570, 595 (2008)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'McDonald v. City of Chicago, 561 U.S. 742, 750 (2010)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Citizens United v. FEC, 558 U.S. 310, 339 (2010)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Shelby Cnty. v. Holder, 570 U.S. 529, 540 (2013)', rules: ['IB R11', 'IB T1', 'IB R11.3.1'] },
  { type: 'case', citation: 'King v. Burwell, 576 U.S. 473, 485 (2015)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Wal-Mart Stores, Inc. v. Dukes, 564 U.S. 338, 350 (2011)', rules: ['IB R11', 'IB T1'] },
  // U.S. Supreme Court (S. Ct. reporter)
  { type: 'case', citation: 'Trump v. Hawaii, 138 S. Ct. 2392, 2403 (2018)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Masterpiece Cakeshop, Ltd. v. Colo. C.R. Comm\'n, 138 S. Ct. 1719, 1723 (2018)', rules: ['IB R11', 'IB T1'] },
  // State high courts (regional reporters)
  { type: 'case', citation: 'People v. Defore, 150 N.E. 585, 587 (N.Y. 1926)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'Tarasoff v. Regents of Univ. of Cal., 551 P.2d 334, 340 (Cal. 1976)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'Li v. Yellow Cab Co., 532 P.2d 1226, 1230 (Cal. 1975)', rules: ['IB R11', 'IB R11.3.1', 'IB R12.2'] },
  { type: 'case', citation: 'Greenman v. Yuba Power Prods., Inc., 377 P.2d 897, 900 (Cal. 1963)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'Escola v. Coca Cola Bottling Co., 150 P.2d 436, 440 (Cal. 1944)', rules: ['IB R11', 'IB R11.3.1', 'IB R12.2'] },
  { type: 'case', citation: 'Dillon v. Legg, 441 P.2d 912, 916 (Cal. 1968)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'Henningsen v. Bloomfield Motors, Inc., 161 A.2d 69, 75 (N.J. 1960)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'Commonwealth v. Johnson, 515 N.E.2d 811, 815 (Mass. 1987)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'People v. Johnson, 552 N.E.2d 950, 954 (Ill. 1990)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'Sindell v. Abbott Labs., 607 P.2d 924, 928 (Cal. 1980)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'Rowland v. Christian, 443 P.2d 561, 564 (Cal. 1968)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  // Regression seeds from pre-AI back-test findings (c0011, c0012, c0013): T6 words
  // beyond the original subset, and a state high court that was missing from T7.
  { type: 'case', citation: 'Monell v. Dep\'t of Soc. Servs., 436 U.S. 658, 690 (1978)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Comm\'r v. Duberstein, 363 U.S. 278, 285 (1960)', rules: ['IB R11', 'IB R11.3.1'] },
  { type: 'case', citation: 'Vosburg v. Putney, 50 N.W. 403, 404 (Wis. 1891)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'Gov\'t of V.I. v. Knight, 989 F.2d 619, 623 (3d Cir. 1993)', rules: ['IB R11', 'IB R11.3.1', 'IB R12.2'] },

  // Regression seeds from the Indigo T1/T3 table expansion (2026-07-18): state
  // reporters + state intermediate courts, and the F.4th series, all previously
  // unparseable (back-test candidate c0014).
  { type: 'case', citation: 'People v. Smith, 470 N.Y.S.2d 987, 990 (N.Y. App. Div. 1984)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', citation: 'Garcia v. Doe, 11 F.4th 1113, 1118 (9th Cir. 2021)', rules: ['IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', citation: 'In re Estate of Doe, 123 A.D.2d 456, 460 (N.Y. App. Div. 1986)', rules: ['IB R11', 'IB T3', 'IB R12.2'] },

  // Nominative reporters (Indigo T1.1): pre-1875 U.S. Reports carry the nominative
  // volume + reporter parenthetically between the reporter and the first page.
  { type: 'case', citation: 'Marbury v. Madison, 5 U.S. (1 Cranch) 137, 177 (1803)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'McCulloch v. Maryland, 17 U.S. (4 Wheat.) 316, 407 (1819)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Gibbons v. Ogden, 22 U.S. (9 Wheat.) 1, 189 (1824)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Martin v. Hunter\'s Lessee, 14 U.S. (1 Wheat.) 304, 324 (1816)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Dred Scott v. Sandford, 60 U.S. (19 How.) 393, 404 (1857)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Ex parte Milligan, 71 U.S. (4 Wall.) 2, 120 (1866)', rules: ['IB R11', 'IB T1'] },
  { type: 'case', citation: 'Chisholm v. Georgia, 2 U.S. (2 Dall.) 419, 429 (1793)', rules: ['IB R11', 'IB T1'] },

  // --- Practitioner style (Indigo R2.1): case name italicized ---
  { type: 'case', style: 'practitioner', citation: '*Smith v. Jones*, 123 F.3d 456, 460 (7th Cir. 1999)', rules: ['IB R2.1', 'IB R11', 'IB T1', 'IB R12.2'] },
  { type: 'case', style: 'practitioner', citation: '*Brown v. Bd. of Educ.*, 347 U.S. 483, 495 (1954)', rules: ['IB R2.1', 'IB R11', 'IB R11.3.1'] },
  { type: 'case', style: 'practitioner', citation: '*Erie R.R. Co. v. Tompkins*, 304 U.S. 64, 78 (1938)', rules: ['IB R2.1', 'IB R11', 'IB R11.3.1'] },
  { type: 'case', style: 'practitioner', citation: '*Palsgraf v. Long Island R.R. Co.*, 162 N.E. 99, 100 (N.Y. 1928)', rules: ['IB R2.1', 'IB R11', 'IB R11.3.1', 'IB R12.2'] },
  { type: 'case', style: 'practitioner', citation: '*In re Winship*, 397 U.S. 358, 364 (1970)', rules: ['IB R2.1', 'IB R11'] },
  { type: 'case', style: 'practitioner', citation: '*Youngstown Sheet & Tube Co. v. Sawyer*, 343 U.S. 579, 587 (1952)', rules: ['IB R2.1', 'IB R11', 'IB R11.3.1'] },
  { type: 'case', style: 'practitioner', citation: '*United States v. Microsoft Corp.*, 253 F.3d 34, 46 (D.C. Cir. 2001)', rules: ['IB R2.1', 'IB R11', 'IB R11.3.1', 'IB R12.2'] },
  { type: 'case', style: 'practitioner', citation: '*Miranda v. Arizona*, 384 U.S. 436, 444 (1966)', rules: ['IB R2.1', 'IB R11'] },
  { type: 'case', style: 'practitioner', citation: '*Tarasoff v. Regents of Univ. of Cal.*, 551 P.2d 334, 340 (Cal. 1976)', rules: ['IB R2.1', 'IB R11', 'IB T3', 'IB R12.2'] },
  { type: 'case', style: 'practitioner', citation: '*Ashcroft v. Iqbal*, 556 U.S. 662, 678 (2009)', rules: ['IB R2.1', 'IB R11'] },
  { type: 'case', style: 'practitioner', citation: '*Gideon v. Wainwright*, 372 U.S. 335, 344 (1963)', rules: ['IB R2.1', 'IB R11'] },
  { type: 'case', style: 'practitioner', citation: '*Katz v. United States*, 389 U.S. 347, 351 (1967)', rules: ['IB R2.1', 'IB R11'] },

  // --------------------------------------------------------------- statutes
  { type: 'statute', citation: '42 U.S.C. § 1983 (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '15 U.S.C. § 78j(b) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '17 U.S.C. § 107 (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '28 U.S.C. § 1331 (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '18 U.S.C. § 1030(a)(2) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '26 U.S.C. § 501(c)(3) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '29 U.S.C. § 158(a)(1) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '35 U.S.C. § 101 (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '42 U.S.C. §§ 2000e to 2000e-17 (2018)', rules: ['IB R16'] },
  { type: 'statute', citation: 'Cal. Civ. Code § 1550 (West 2020)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: 'N.Y. Gen. Bus. Law § 349 (McKinney 2019)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: 'Tex. Penal Code Ann. § 22.01 (West 2019)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '5 U.S.C. § 552(b)(4) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '11 U.S.C. § 362(a) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '20 U.S.C. § 1681(a) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '8 U.S.C. § 1101(a)(15) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '21 U.S.C. § 841(a)(1) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '47 U.S.C. § 230(c)(1) (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: '12 U.S.C. § 5301 (2018)', rules: ['IB R16', 'IB T1'] },
  { type: 'statute', citation: 'Fla. Stat. § 768.81 (2020)', rules: ['IB R16', 'IB T1'] },

  // ------------------------------------------------------------ periodicals
  { type: 'periodical', citation: 'Cass R. Sunstein, *Incompletely Theorized Agreements*, 108 %Harv. L. Rev.% 1733, 1745 (1995)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Frank H. Easterbrook, *The Court and the Economic System*, 98 %Harv. L. Rev.% 4, 20 (1984)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Samuel D. Warren & Louis D. Brandeis, *The Right to Privacy*, 4 %Harv. L. Rev.% 193, 195 (1890)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Oliver Wendell Holmes, *The Path of the Law*, 10 %Harv. L. Rev.% 457, 461 (1897)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Charles A. Reich, *The New Property*, 73 %Yale L.J.% 733, 737 (1964)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Herbert Wechsler, *Toward Neutral Principles of Constitutional Law*, 73 %Harv. L. Rev.% 1, 19 (1959)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Antonin Scalia, *The Rule of Law as a Law of Rules*, 56 %U. Chi. L. Rev.% 1175, 1180 (1989)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Guido Calabresi & A. Douglas Melamed, *Property Rules, Liability Rules, and Inalienability*, 85 %Harv. L. Rev.% 1089, 1092 (1972)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Wesley Newcomb Hohfeld, *Some Fundamental Legal Conceptions as Applied in Judicial Reasoning*, 23 %Yale L.J.% 16, 30 (1913)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Roscoe Pound, *The Path of the Law*, 24 %Colum. L. Rev.% 591, 600 (1924)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Lon L. Fuller, *The Forms and Limits of Adjudication*, 92 %Harv. L. Rev.% 353, 360 (1978)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Owen M. Fiss, *The Forms of Justice*, 93 %Harv. L. Rev.% 1, 17 (1979)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Duncan Kennedy, *Form and Substance in Private Law Adjudication*, 89 %Harv. L. Rev.% 1685, 1690 (1976)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Mark A. Lemley, *The Myth of the Sole Inventor*, 110 %Mich. L. Rev.% 709, 715 (2012)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Akhil Reed Amar, *Of Sovereignty and Federalism*, 96 %Yale L.J.% 1425, 1430 (1987)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Richard A. Epstein, *The Social Consequences of Common Sense*, 60 %Cornell L. Rev.% 100, 110 (1975)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Kimberlé W. Crenshaw, *Mapping the Margins*, 43 %Stan. L. Rev.% 1241, 1250 (1991)', rules: ['IB R30', 'IB R30.3'] },
  { type: 'periodical', citation: 'Louis L. Jaffe, *The Right to Judicial Review*, 71 %Harv. L. Rev.% 401, 410 (1958)', rules: ['IB R30', 'IB R30.3'] },

  // ----------------------------------------------------------------- books
  { type: 'book', citation: '%John Rawls, A Theory of Justice% 11 (1971)', rules: ['IB R28'] },
  { type: 'book', citation: '%H.L.A. Hart, The Concept of Law% 79 (2d ed. 1994)', rules: ['IB R28'] },
  { type: 'book', citation: '%Ronald Dworkin, Taking Rights Seriously% 22 (1977)', rules: ['IB R28'] },
  { type: 'book', citation: '%Richard A. Posner, Economic Analysis of Law% 45 (9th ed. 2014)', rules: ['IB R28'] },
  { type: 'book', citation: '%Oliver Wendell Holmes, The Common Law% 5 (1881)', rules: ['IB R28'] },
  { type: 'book', citation: '%Guido Calabresi, The Costs of Accidents% 24 (1970)', rules: ['IB R28'] },
  { type: 'book', citation: '%Antonin Scalia & Bryan A. Garner, Reading Law% 56 (2012)', rules: ['IB R28'] },
  { type: 'book', citation: '%Benjamin N. Cardozo, The Nature of the Judicial Process% 51 (1921)', rules: ['IB R28'] },
  { type: 'book', citation: '%Lawrence Lessig, Code and Other Laws of Cyberspace% 30 (1999)', rules: ['IB R28'] },
  { type: 'book', citation: '%Bruce Ackerman, We the People% 40 (1991)', rules: ['IB R28'] },
  { type: 'book', citation: '%Henry M. Hart & Albert M. Sacks, The Legal Process% 100 (1994)', rules: ['IB R28'] },
  { type: 'book', citation: '%Karl N. Llewellyn, The Bramble Bush% 12 (1930)', rules: ['IB R28'] },
  { type: 'book', citation: '%Roscoe Pound, An Introduction to the Philosophy of Law% 47 (1922)', rules: ['IB R28'] },
  { type: 'book', citation: '%John Hart Ely, Democracy and Distrust% 87 (1980)', rules: ['IB R28'] },
  { type: 'book', citation: '%Grant Gilmore, The Death of Contract% 55 (2d ed. 1995)', rules: ['IB R28'] },
  { type: 'book', citation: '%Melvin A. Eisenberg, The Nature of the Common Law% 14 (1988)', rules: ['IB R28'] },
  { type: 'book', citation: '%Frederick Schauer, Playing by the Rules% 38 (1991)', rules: ['IB R28'] },
  { type: 'book', citation: '%Cass R. Sunstein, Legal Reasoning and Political Conflict% 62 (1996)', rules: ['IB R28'] },
  { type: 'book', citation: '%William L. Prosser, Handbook of the Law of Torts% 145 (4th ed. 1971)', rules: ['IB R28'] },
  { type: 'book', citation: '%Wesley Newcomb Hohfeld, Fundamental Legal Conceptions% 23 (1919)', rules: ['IB R28'] },
];
