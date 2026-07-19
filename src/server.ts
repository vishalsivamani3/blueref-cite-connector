#!/usr/bin/env node
/**
 * BlueRef MCP server entry point (PRD Section 6.5).
 *
 * Registers the five tools over stdio transport. All formatting logic lives in
 * the deterministic engine; this layer only marshals tool I/O. Every response
 * includes a `disclaimer` field (PRD Section 4.3) and a `confidence` field
 * ("deterministic" | "unsupported", PRD Section 6.5).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  checkCitation,
  checkDocument,
  formatCitation,
  listSupported,
  parseCitation,
} from './engine/index.js';

const server = new McpServer({ name: 'blueref', version: '0.1.0' });

/** Wrap a JSON-serializable payload as an MCP text tool result. */
function json(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

server.registerTool(
  'parse_citation',
  {
    title: 'Parse a legal citation',
    description:
      'Detect the citation type and return structured components. Returns ' +
      'confidence "unsupported" if no supported type is detected.',
    inputSchema: { input: z.string().describe('The citation string to parse.') },
  },
  async ({ input }) => json(parseCitation(input)),
);

server.registerTool(
  'check_citation',
  {
    title: 'Check a legal citation',
    description:
      'Check a single citation for academic (Indigo Book-derived) formatting ' +
      'violations. Returns pass/fail, each violation with an error code, ' +
      'explanation, Indigo Book rule reference, and fix, plus the corrected ' +
      'citation. `context` is the ordered list of preceding footnotes, required ' +
      'for id./supra validation.',
    inputSchema: {
      input: z.string().describe('The citation string to check.'),
      context: z
        .array(z.string())
        .optional()
        .describe('Ordered preceding footnotes, for id./supra resolution.'),
      style: z
        .enum(['academic', 'practitioner'])
        .optional()
        .describe('Citation style: "practitioner" (Indigo Book, italic case names) or "academic". Defaults to academic.'),
    },
  },
  async ({ input, context, style }) => json(checkCitation(input, context, style)),
);

server.registerTool(
  'format_citation',
  {
    title: 'Format a legal citation',
    description:
      'Build a canonical academic citation from structured components. Returns ' +
      'confidence "unsupported" if the type has no registered rule module.',
    inputSchema: {
      components: z.record(z.unknown()).describe('Structured citation fields.'),
      type: z.string().describe('Citation type id, e.g. "case" | "statute".'),
      style: z
        .enum(['academic', 'practitioner'])
        .optional()
        .describe('Citation style. Defaults to academic.'),
    },
  },
  async ({ components, type, style }) => json(formatCitation(components, type, style)),
);

server.registerTool(
  'check_document',
  {
    title: 'Check an ordered list of footnotes',
    description:
      'Batch-check an ordered footnote list, resolving short forms (id./supra) ' +
      'across the sequence. Returns per-footnote results plus a summary.',
    inputSchema: {
      footnotes: z.array(z.string()).describe('Ordered list of footnote strings.'),
      style: z
        .enum(['academic', 'practitioner'])
        .optional()
        .describe('Citation style. Defaults to academic.'),
    },
  },
  async ({ footnotes, style }) => json(checkDocument(footnotes, style)),
);

server.registerTool(
  'list_supported',
  {
    title: 'List supported citation types',
    description:
      'Return the supported citation types, known limitations, and the disclaimer.',
    inputSchema: {},
  },
  async () => json(listSupported()),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for logs; stdout is the MCP transport.
  console.error('BlueRef MCP server running on stdio.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
