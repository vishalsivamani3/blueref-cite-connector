# Outside tester protocol (PRD §10.2)

PRD §10.2 requires BlueRef to be **installable and usable by a stranger via `npx` in
an MCP client, verified by at least one outside tester**. This is the script for that.

## Who counts

Anyone who is **not the project owner** and has not worked on the code. A classmate,
a journal colleague, another student. They do not need to know the citation rules —
the point is to catch what the owner's machine hides: a missing build step, a Node
assumption, a bad `bin` path, wrong install instructions.

They need **Node 20+** and an **MCP client** (Claude Desktop is the easiest).

## Two install paths

**A — from GitHub (works today, no npm release needed).**
The repo has a `prepare` script, so npm builds on install:

```
npx github:vishalsivamani3/blueref-cite-connector
```

**B — from npm (after `npm publish`).** The name `blueref` is available.

```
npx blueref
```

Either way, the MCP client config is:

```json
{
  "mcpServers": {
    "blueref": { "command": "npx", "args": ["github:vishalsivamani3/blueref-cite-connector"] }
  }
}
```

(swap the arg for `["blueref"]` once published)

## What the tester does

Ask their MCP client to run each of these and paste back what it returns.

**1. `list_supported`** — expected:
- five types: `case`, `shortform`, `statute`, `periodical`, `book`
- two styles, default `practitioner`
- a `disclaimer` field beginning "BlueRef is an independent open-source project…"

**2. `check_citation`** with `Smith v. Jones, 123 F. 3d 456, 460 (7th Circuit 1999)` — expected:
- `pass: false`
- codes `SPACING`, `DATE_COURT`, `TYPEFACE`
- corrected: `*Smith v. Jones*, 123 F.3d 456, 460 (7th Cir. 1999)`

**3. `check_citation`** with `17 U.S.C. § 107` — expected `pass: true`
(a yearless U.S.C. cite is correct; Indigo R16.1.2 makes the year optional)

**4. `check_document`** with these two footnotes in order:
```
["*Hormel Foods Corp. v. Jim Henson Prods., Inc.*, 73 F.3d 497, 504 (2d Cir. 1996); *Naked Cowboy v. CBS*, 844 F. Supp. 2d 510, 517 (S.D.N.Y. 2012)", "*Id.*"]
```
expected: a `SHORTFORM_CONTEXT` violation on footnote 2 — `id.` may not follow a
string citation (Indigo R15.3.3).

**5. Something out of scope**, e.g. `29 C.F.R. § 1910.132 (2020)` — expected
`confidence: "unsupported"`, refused rather than checked.

## Known harmless noise

On startup the server prints to **stderr**:

```
ExperimentalWarning: Importing JSON modules is an experimental feature
BlueRef MCP server running on stdio.
```

Both are expected. stdout carries the MCP protocol; stderr is only logging. If the
client shows these, it is not a failure.

## What to report back

1. Did the install command work without editing anything? If not, the exact error.
2. Did all five checks return what is listed above? Paste any that differed.
3. Was anything in the README wrong or missing for getting started?
4. Node version and OS.

Item 3 matters as much as the rest — the requirement is that a *stranger* can use it,
which includes the instructions being correct.

## Record

Fill this in once a tester has run it; this is the §10.2 artifact.

| | |
|---|---|
| Tester (name/handle) | |
| Date | |
| Install path used | A (GitHub) / B (npm) |
| Node version / OS | |
| All five checks passed | yes / no |
| Issues found | |
| Resolution | |
