# Adding a citation type

A new citation type is **one PR** containing:

1. one `RuleModule` file in `src/engine/rules/`,
2. any data tables it needs in `src/data/`,
3. a corpus slice of **≥100 entries at 99.5%**,

and **no changes to the server core**. If you find yourself editing
`src/server.ts`, stop — the contract is designed so you don't have to.

The difficulty should be dominated by knowing the citation rules, not by
understanding the codebase.

## Step 1 — Implement the `RuleModule` contract

Every type implements this one interface (`src/engine/types.ts`):

```typescript
interface RuleModule {
  id: CitationType;                          // e.g. "regulation"
  detect(input: string): number;             // 0..1 confidence it is this type
  parse(input: string): ParseResult;         // structured components or typed failure
  check(parsed: Citation): CheckResult;      // violations w/ code, rule ref, fix
  format(components: CitationInput): string;  // canonical citation from components
}
```

Rules:

- **Self-contained.** Import only `../types.js` and `../../data/*.json`. No
  cross-module imports (PRD §12).
- **Deterministic.** No LLM calls, no network, no randomness.
- Each `check` violation must carry: an error **code** from the §7.5 taxonomy, a
  human-readable **message**, the Indigo Book **rule** reference, and the
  corrected **fix** fragment.
- `detect` should return **below** `DETECT_THRESHOLD` (see `registry.ts`) for
  inputs that are not your type, so the engine refuses rather than mis-detects.

## Step 2 — Register it

Add two lines to `src/engine/registry.ts`:

```typescript
import { regulationModule } from './rules/regulations.js';
// ...
const MODULES: RuleModule[] = [/* ...existing, */ regulationModule];
```

That's the only change to shared code.

## Step 3 — Data tables

Abbreviations are **data, not code** (PRD §11.2). Put them in
`src/data/<name>.json` with a `_meta` block recording the Indigo Book table and
`provenance: "indigo-book-derived"`. Unknown entries should trigger a distinct
violation (e.g. "unrecognized reporter"), never a guess.

## Step 4 — Corpus slice (≥100 entries at 99.5%)

Follow the composition in PRD §7.3: roughly 50% clean, 35% single-error, 15%
multi-error/adversarial. Two ways to produce entries:

- **Seeds + mutators (synthetic).** Add clean citations to `tests/seeds.ts` and,
  if needed, error operators to `tests/mutators.ts`, then `npm run corpus:gen`.
  All generator output is `provenance: "synthetic"`.
- **Hand-verified.** A human adds `provenance: "hand-verified"` entries drawn
  from published law-review footnotes (citations are uncopyrightable facts; never
  copy surrounding prose). Claude Code does not add hand-verified entries.

Every entry needs an Indigo Book rule reference (`rules`). Validate:

```bash
npm run corpus:gen && npm test
```

Then raise your type's floor in `tests/phase.json` once it's green.

## Step 5 — Verify the whole thing

```bash
npm run typecheck && npm run lint && npm run corpus:gen && npm run test:ci && npm run smoke
```

`npm run corpus:gen` must leave **no git diff** (the corpus is reproducible), and
`test:ci` must be at or above the phase floor. Open the PR.

## Example: the corpus entry schema

```json
{
  "id": "case-0173",
  "type": "case",
  "mode": "check",
  "input": "Smith v. Jones, 123 F. 3d 456, 460 (7th Circuit 1999)",
  "expected_violations": ["SPACING", "DATE_COURT"],
  "expected_output": "Smith v. Jones, 123 F.3d 456, 460 (7th Cir. 1999)",
  "rules": ["IB R11.6.2", "IB R12.2"],
  "provenance": "synthetic",
  "notes": "spacing in F.3d; court abbreviation"
}
```

See [`../tests/corpus/SCHEMA.md`](../tests/corpus/SCHEMA.md) for the full schema,
typeface markers (`*italic*`, `%small caps%`), and the error-code taxonomy.
