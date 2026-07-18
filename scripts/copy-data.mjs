/**
 * Copy the abbreviation-table JSON from src/data into dist/data after tsc.
 *
 * tsc typechecks JSON imports (resolveJsonModule) but does not emit them, so the
 * compiled rule modules under dist/engine/rules need the tables copied alongside.
 */
import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src', 'data');
const dest = join(root, 'dist', 'data');

if (!existsSync(src)) {
  console.error('copy-data: src/data not found');
  process.exit(1);
}
cpSync(src, dest, { recursive: true });
console.error(`copy-data: src/data -> dist/data`);
