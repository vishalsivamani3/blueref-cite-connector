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

function textOf(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const first = result.content[0];
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

  // list_supported answers with disclaimer + limitations.
  const listed = textOf(await client.callTool({ name: 'list_supported', arguments: {} })) as {
    supportedTypes: string[];
    limitations: string[];
    disclaimer: string;
  };
  assert(listed.disclaimer === DISCLAIMER, 'list_supported includes the exact disclaimer');
  assert(Array.isArray(listed.limitations) && listed.limitations.length > 0, 'list_supported reports limitations');
  assert(Array.isArray(listed.supportedTypes), 'list_supported reports supportedTypes (empty in Phase 0)');

  // check_citation refuses loudly in Phase 0 (no modules): unsupported, with disclaimer.
  const checked = textOf(
    await client.callTool({
      name: 'check_citation',
      arguments: { input: 'Smith v. Jones, 123 F.3d 456, 460 (7th Cir. 1999)' },
    }),
  ) as { confidence: string; disclaimer: string };
  assert(checked.confidence === 'unsupported', 'check_citation refuses (unsupported) in Phase 0');
  assert(checked.disclaimer === DISCLAIMER, 'check_citation includes the exact disclaimer');

  await client.close();
  console.log(`SMOKE PASS: ${EXPECTED_TOOLS.length} tools registered; disclaimer present; unsupported refused.`);
}

main().catch((err) => {
  console.error('SMOKE FAIL:', err);
  process.exit(1);
});
