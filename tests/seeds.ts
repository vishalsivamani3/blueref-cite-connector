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
import type { CitationType } from '../src/engine/types.js';

export interface Seed {
  type: CitationType;
  /** Clean, canonical citation string (with typeface markers where applicable). */
  citation: string;
  /** Indigo Book rule reference(s) the clean form exercises. */
  rules: string[];
  notes?: string;
}

export const SEEDS: Seed[] = [
  // ------------------------------------------------------------------ cases
  { type: 'case', citation: 'Smith v. Jones, 123 F.3d 456, 460 (7th Cir. 1999)', rules: ['IB R10', 'IB T1', 'IB T7'] },
  { type: 'case', citation: 'United States v. Hayes, 219 F.3d 449, 452 (5th Cir. 2000)', rules: ['IB R10', 'IB T1', 'IB T7'] },
  { type: 'case', citation: 'Doe v. Univ. of Mich., 78 F.3d 1113, 1120 (6th Cir. 1996)', rules: ['IB R10', 'IB T6', 'IB T7'] },
  { type: 'case', citation: 'ACLU v. Reno, 217 F.3d 162, 173 (3d Cir. 2000)', rules: ['IB R10', 'IB T7'] },
  { type: 'case', citation: 'Nken v. Holder, 556 F.3d 1028, 1032 (D.C. Cir. 2009)', rules: ['IB R10', 'IB T7'] },
  { type: 'case', citation: 'Garcia v. City of L.A., 213 F.3d 1113, 1118 (9th Cir. 2000)', rules: ['IB R10', 'IB T7', 'IB T10'] },
  { type: 'case', citation: 'Doe v. Roe, 123 F. Supp. 2d 456, 460 (S.D.N.Y. 2000)', rules: ['IB R10', 'IB T1', 'IB T7'] },
  { type: 'case', citation: 'Palsgraf v. Long Island R.R. Co., 162 N.E. 99, 100 (N.Y. 1928)', rules: ['IB R10', 'IB T6', 'IB T7'] },
  { type: 'case', citation: 'MacPherson v. Buick Motor Co., 111 N.E. 1050, 1053 (N.Y. 1916)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'Brown v. Board of Education, 347 U.S. 483, 495 (1954)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Miranda v. Arizona, 384 U.S. 436, 444 (1966)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'United States v. Nixon, 418 U.S. 683, 705 (1974)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Gideon v. Wainwright, 372 U.S. 335, 344 (1963)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Mapp v. Ohio, 367 U.S. 643, 655 (1961)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Katz v. United States, 389 U.S. 347, 351 (1967)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Terry v. Ohio, 392 U.S. 1, 20 (1968)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Grutter v. Bollinger, 539 U.S. 306, 325 (2003)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Int\'l Shoe Co. v. Washington, 326 U.S. 310, 316 (1945)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'Ashcroft v. Iqbal, 556 U.S. 662, 678 (2009)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Bell Atl. Corp. v. Twombly, 550 U.S. 544, 570 (2007)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'Erie R.R. Co. v. Tompkins, 304 U.S. 64, 78 (1938)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'Lochner v. New York, 198 U.S. 45, 53 (1905)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'United States v. Microsoft Corp., 253 F.3d 34, 46 (D.C. Cir. 2001)', rules: ['IB R10', 'IB T1', 'IB T6', 'IB T7'] },
  { type: 'case', citation: 'Whitman v. Am. Trucking Ass\'ns, 531 U.S. 457, 465 (2001)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'NLRB v. Jones & Laughlin Steel Corp., 301 U.S. 1, 30 (1937)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'Youngstown Sheet & Tube Co. v. Sawyer, 343 U.S. 579, 587 (1952)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'SEC v. W.J. Howey Co., 328 U.S. 293, 298 (1946)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'Feist Publ\'ns, Inc. v. Rural Tel. Serv. Co., 499 U.S. 340, 345 (1991)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'Sony Corp. of Am. v. Universal City Studios, Inc., 464 U.S. 417, 420 (1984)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'Perez v. Mortg. Bankers Ass\'n, 575 U.S. 92, 96 (2015)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'United States v. Jones, 565 U.S. 400, 404 (2012)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Riley v. California, 573 U.S. 373, 385 (2014)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Obergefell v. Hodges, 576 U.S. 644, 675 (2015)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Katzenbach v. McClung, 379 U.S. 294, 300 (1964)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Johnson v. Transp. Agency, 480 U.S. 616, 620 (1987)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'Van Orden v. Perry, 545 U.S. 677, 690 (2005)', rules: ['IB R10', 'IB T1'] },
  { type: 'case', citation: 'Hurley v. Irish-Am. Grp., 515 U.S. 557, 560 (1995)', rules: ['IB R10', 'IB T6'] },
  { type: 'case', citation: 'United States v. Va., 518 U.S. 515, 531 (1996)', rules: ['IB R10', 'IB T10'] },
  { type: 'case', citation: 'Kelo v. City of New London, 545 U.S. 469, 477 (2005)', rules: ['IB R10', 'IB T1'] },

  // --------------------------------------------------------------- statutes
  { type: 'statute', citation: '42 U.S.C. § 1983 (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '15 U.S.C. § 78j(b) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '17 U.S.C. § 107 (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '28 U.S.C. § 1331 (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '18 U.S.C. § 1030(a)(2) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '26 U.S.C. § 501(c)(3) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '29 U.S.C. § 158(a)(1) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '35 U.S.C. § 101 (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '42 U.S.C. §§ 2000e to 2000e-17 (2018)', rules: ['IB R12.3'] },
  { type: 'statute', citation: 'Cal. Civ. Code § 1550 (West 2020)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: 'N.Y. Gen. Bus. Law § 349 (McKinney 2019)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: 'Tex. Penal Code Ann. § 22.01 (West 2019)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '5 U.S.C. § 552(b)(4) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '11 U.S.C. § 362(a) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '20 U.S.C. § 1681(a) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '8 U.S.C. § 1101(a)(15) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '21 U.S.C. § 841(a)(1) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '47 U.S.C. § 230(c)(1) (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: '12 U.S.C. § 5301 (2018)', rules: ['IB R12', 'IB T1'] },
  { type: 'statute', citation: 'Fla. Stat. § 768.81 (2020)', rules: ['IB R12', 'IB T1'] },

  // ------------------------------------------------------------ periodicals
  { type: 'periodical', citation: 'Cass R. Sunstein, *Incompletely Theorized Agreements*, 108 %Harv. L. Rev.% 1733, 1745 (1995)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Frank H. Easterbrook, *The Court and the Economic System*, 98 %Harv. L. Rev.% 4, 20 (1984)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Samuel D. Warren & Louis D. Brandeis, *The Right to Privacy*, 4 %Harv. L. Rev.% 193, 195 (1890)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Oliver Wendell Holmes, *The Path of the Law*, 10 %Harv. L. Rev.% 457, 461 (1897)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Charles A. Reich, *The New Property*, 73 %Yale L.J.% 733, 737 (1964)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Herbert Wechsler, *Toward Neutral Principles of Constitutional Law*, 73 %Harv. L. Rev.% 1, 19 (1959)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Antonin Scalia, *The Rule of Law as a Law of Rules*, 56 %U. Chi. L. Rev.% 1175, 1180 (1989)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Guido Calabresi & A. Douglas Melamed, *Property Rules, Liability Rules, and Inalienability*, 85 %Harv. L. Rev.% 1089, 1092 (1972)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Wesley Newcomb Hohfeld, *Some Fundamental Legal Conceptions as Applied in Judicial Reasoning*, 23 %Yale L.J.% 16, 30 (1913)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Roscoe Pound, *The Path of the Law*, 24 %Colum. L. Rev.% 591, 600 (1924)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Lon L. Fuller, *The Forms and Limits of Adjudication*, 92 %Harv. L. Rev.% 353, 360 (1978)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Owen M. Fiss, *The Forms of Justice*, 93 %Harv. L. Rev.% 1, 17 (1979)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Duncan Kennedy, *Form and Substance in Private Law Adjudication*, 89 %Harv. L. Rev.% 1685, 1690 (1976)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Mark A. Lemley, *The Myth of the Sole Inventor*, 110 %Mich. L. Rev.% 709, 715 (2012)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Akhil Reed Amar, *Of Sovereignty and Federalism*, 96 %Yale L.J.% 1425, 1430 (1987)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Richard A. Epstein, *The Social Consequences of Common Sense*, 60 %Cornell L. Rev.% 100, 110 (1975)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Kimberlé W. Crenshaw, *Mapping the Margins*, 43 %Stan. L. Rev.% 1241, 1250 (1991)', rules: ['IB R13', 'IB T13'] },
  { type: 'periodical', citation: 'Louis L. Jaffe, *The Right to Judicial Review*, 71 %Harv. L. Rev.% 401, 410 (1958)', rules: ['IB R13', 'IB T13'] },

  // ----------------------------------------------------------------- books
  { type: 'book', citation: '%John Rawls, A Theory of Justice% 11 (1971)', rules: ['IB R15'] },
  { type: 'book', citation: '%H.L.A. Hart, The Concept of Law% 79 (2d ed. 1994)', rules: ['IB R15'] },
  { type: 'book', citation: '%Ronald Dworkin, Taking Rights Seriously% 22 (1977)', rules: ['IB R15'] },
  { type: 'book', citation: '%Richard A. Posner, Economic Analysis of Law% 45 (9th ed. 2014)', rules: ['IB R15'] },
  { type: 'book', citation: '%Oliver Wendell Holmes, The Common Law% 5 (1881)', rules: ['IB R15'] },
  { type: 'book', citation: '%Guido Calabresi, The Costs of Accidents% 24 (1970)', rules: ['IB R15'] },
  { type: 'book', citation: '%Antonin Scalia & Bryan A. Garner, Reading Law% 56 (2012)', rules: ['IB R15'] },
  { type: 'book', citation: '%Benjamin N. Cardozo, The Nature of the Judicial Process% 51 (1921)', rules: ['IB R15'] },
  { type: 'book', citation: '%Lawrence Lessig, Code and Other Laws of Cyberspace% 30 (1999)', rules: ['IB R15'] },
  { type: 'book', citation: '%Bruce Ackerman, We the People% 40 (1991)', rules: ['IB R15'] },
  { type: 'book', citation: '%Henry M. Hart & Albert M. Sacks, The Legal Process% 100 (1994)', rules: ['IB R15'] },
  { type: 'book', citation: '%Karl N. Llewellyn, The Bramble Bush% 12 (1930)', rules: ['IB R15'] },
  { type: 'book', citation: '%Roscoe Pound, An Introduction to the Philosophy of Law% 47 (1922)', rules: ['IB R15'] },
  { type: 'book', citation: '%John Hart Ely, Democracy and Distrust% 87 (1980)', rules: ['IB R15'] },
  { type: 'book', citation: '%Grant Gilmore, The Death of Contract% 55 (2d ed. 1995)', rules: ['IB R15'] },
  { type: 'book', citation: '%Melvin A. Eisenberg, The Nature of the Common Law% 14 (1988)', rules: ['IB R15'] },
  { type: 'book', citation: '%Frederick Schauer, Playing by the Rules% 38 (1991)', rules: ['IB R15'] },
  { type: 'book', citation: '%Cass R. Sunstein, Legal Reasoning and Political Conflict% 62 (1996)', rules: ['IB R15'] },
  { type: 'book', citation: '%William L. Prosser, Handbook of the Law of Torts% 145 (4th ed. 1971)', rules: ['IB R15'] },
  { type: 'book', citation: '%Wesley Newcomb Hohfeld, Fundamental Legal Conceptions% 23 (1919)', rules: ['IB R15'] },
];
