/**
 * MCP server smoke test (PRD Section 9, Phase 0 exit criterion:
 * "MCP server answers list_supported").
 *
 * Spawns the built server over stdio via the official MCP client, lists tools,
 * calls list_supported and check_citation, and asserts the Phase 0 contract:
 * all five tools present, disclaimer in every response, and unsupported inputs
 * refused (confidence "unsupported") rather than guessed.
 *
 * Run: `npm run build && npx tsx tests/smoke.ts`
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DISCLAIMER } from '../src/engine/disclaimer.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, '..', 'dist', 'server.js');

const EXPECTED_TOOLS = [
  'parse_citation',
  'check_citation',
  'format_citation',
  'check_document',
  'list_supported',
];

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error('SMOKE FAIL: ' + msg);
    process.exit(1);
  }
}

function textOf(result: unknown): unknown {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content;
  const first = content?.[0];
  assert(first && first.type === 'text' && typeof first.text === 'string', 'tool returned text content');
  return JSON.parse(first!.text!);
}

async function main(): Promise<void> {
  const transport = new StdioClientTransport({ command: 'node', args: [SERVER] });
  const client = new Client({ name: 'blueref-smoke', version: '0.1.0' });
  await client.connect(transport);

  // Tools present.
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  for (const t of EXPECTED_TOOLS) assert(names.includes(t), `tool "${t}" is registered`);

  // list_supported answers with disclaimer + limitations; cases are supported (Phase 1).
  const listed = textOf(await client.callTool({ name: 'list_supported', arguments: {} })) as {
    supportedTypes: string[];
    limitations: string[];
    disclaimer: string;
  };
  assert(listed.disclaimer === DISCLAIMER, 'list_supported includes the exact disclaimer');
  assert(Array.isArray(listed.limitations) && listed.limitations.length > 0, 'list_supported reports limitations');
  assert(listed.supportedTypes.includes('case'), 'list_supported reports "case" as supported (Phase 1)');

  // A clean case passes deterministically.
  const clean = textOf(
    await client.callTool({
      name: 'check_citation',
      arguments: { input: 'Smith v. Jones, 123 F.3d 456, 460 (7th Cir. 1999)' },
    }),
  ) as { confidence: string; pass: boolean; disclaimer: string };
  assert(clean.confidence === 'deterministic', 'check_citation handles a case deterministically');
  assert(clean.pass === true, 'a clean case passes');
  assert(clean.disclaimer === DISCLAIMER, 'check_citation includes the exact disclaimer');

  // A malformed case is corrected with the right violation codes.
  const bad = textOf(
    await client.callTool({
      name: 'check_citation',
      arguments: { input: 'Smith v. Jones, 123 F. 3d 456, 460 (7th Circuit 1999)' },
    }),
  ) as { confidence: string; pass: boolean; corrected: string; violations: Array<{ code: string }> };
  assert(bad.pass === false, 'a malformed case fails');
  assert(bad.corrected === 'Smith v. Jones, 123 F.3d 456, 460 (7th Cir. 1999)', 'malformed case is corrected exactly');
  const codes = bad.violations.map((v) => v.code).sort();
  assert(codes.join(',') === 'DATE_COURT,SPACING', `expected SPACING+DATE_COURT, got ${codes.join(',')}`);

  // An out-of-scope input (a statute — no module yet) is refused, not guessed.
  const unsupported = textOf(
    await client.callTool({ name: 'check_citation', arguments: { input: '42 U.S.C. § 1983 (2018)' } }),
  ) as { confidence: string };
  assert(unsupported.confidence === 'unsupported', 'out-of-scope input is refused (unsupported)');

  await client.close();
  console.log(`SMOKE PASS: ${EXPECTED_TOOLS.length} tools; cases supported + corrected; out-of-scope refused; disclaimer present.`);
}

main().catch((err) => {
  console.error('SMOKE FAIL:', err);
  process.exit(1);
});
