# BlueRef

**A deterministic legal citation checker and formatter, exposed over [MCP](https://modelcontextprotocol.io).**

BlueRef checks and formats legal citations under academic conventions using a
pure, deterministic engine — no LLM in the parse/check/format path, so it does
not hallucinate. Any MCP client (Claude Desktop, Claude Code, other agents) can
connect to it for citation ground truth.

Rules and abbreviation tables are derived from **[The Indigo Book](https://law.resource.org/pub/us/code/blue/IndigoBook.html)** (CC0, public domain).

> ⚠️ **Status: pre-release (Phase 1).** The **case** citation type is implemented
> and passing its corpus slice at 100% (367 entries, growing toward 500). Statutes,
> periodicals, and books are not registered yet, so they return
> `confidence: "unsupported"` by design. See [the roadmap](#roadmap).

## Disclaimer

BlueRef is an independent open-source project. It is not affiliated with,
endorsed by, or a substitute for The Bluebook or any citation authority. It
checks citation format only. It does not verify that sources exist, are quoted
accurately, or support the propositions cited. Output should be reviewed by a
human before use in academic or legal work. **This is not legal advice.**

## Install

Requires Node 20+.

```bash
npx blueref
```

This runs the MCP server on stdio. Add it to an MCP client, e.g. Claude Desktop
(`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "blueref": {
      "command": "npx",
      "args": ["blueref"]
    }
  }
}
```

_A 90-second demo GIF will be added at the v1.0 ship milestone._

## Tools

| Tool | Purpose |
|---|---|
| `parse_citation(input)` | Detect the citation type and return structured components. |
| `check_citation(input, context?)` | Check one citation; return violations (code, explanation, Indigo Book rule, fix) and the corrected citation. `context` is preceding footnotes, for id./supra. |
| `format_citation(components, type)` | Build a canonical citation from structured fields. |
| `check_document(footnotes)` | Batch-check an ordered footnote list, resolving short forms across the sequence. |
| `list_supported()` | Supported citation types, known limitations, and the disclaimer. |

Every response carries a `disclaimer` field and a `confidence` field
(`"deterministic"` or `"unsupported"`). Unsupported inputs are refused, never
guessed.

## Supported citation types

| Type | Status | Indigo Book |
|---|---|---|
| Cases | ✅ Phase 1 (100% on slice) | R10, T1, T6, T7 |
| Statutes | 🚧 Phase 2 | R12, T1 |
| Periodicals (law review articles) | 🚧 Phase 2 | R13, T13 |
| Books | 🚧 Phase 3 | R15 |
| Short forms (id., supra) | 🚧 Phase 3 | R11, R16 |

Academic (Whitepages-style) format only.

## Limitations (v1 non-goals)

- Bluepages / court-document formatting (v2 candidate).
- Foreign, international, and treaty citations.
- Legislative history, regulations, and administrative materials beyond basic statutory codes.
- **Format only.** Does not verify a source exists, is quoted accurately, or supports the proposition cited.
- No GUI — BlueRef is a server consumed by MCP clients.

## Development

```bash
npm install
npm run corpus:gen   # (re)generate the synthetic corpus from seeds + mutators
npm test             # run the corpus harness, print accuracy per type + per code
npm run typecheck
npm run lint
npm run smoke        # build, then exercise the MCP server end-to-end over stdio
```

The corpus is **corpus-first** (PRD §7.1): the harness and corpus exist before
any rule logic, and CI blocks any change that drops accuracy below the current
phase floor (`tests/phase.json`). A test passes only on exact match after
whitespace normalization — no partial credit.

See [`tests/corpus/SCHEMA.md`](tests/corpus/SCHEMA.md) for the corpus entry
schema and the §7.5 error-code taxonomy.

## Contributing

New citation types and corpus entries are welcome. A new type is **one
`RuleModule` file + data tables + a ≥100-entry corpus slice at 99.5%**, submitted
as one PR. The hard part should be knowing the citation rules, not the codebase.

- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)
- [`docs/ADDING_A_CITATION_TYPE.md`](docs/ADDING_A_CITATION_TYPE.md)

## Roadmap

| Phase | Scope |
|---|---|
| 0 | Foundations: MCP server, corpus schema, harness, CI. ✅ |
| 1 | Cases at 99.5%. ✅ module done (367-entry slice at 100%; growing to 500, short forms pending). |
| 2 | Statutes + periodicals at 99.5%. |
| 3 | Books + `check_document` id./supra resolution. |
| 4 | Field test on real law-review footnotes; harden. |
| 5 | Ship: npm publish, docs, stranger-install test. |

## License

[MIT](LICENSE). Corpus data files are also MIT. Rules derive from The Indigo Book (CC0).
