import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// eslint lets lib/api/**/actions.ts import server-only modules because those
// files are server actions. this keeps that true: without the directive the
// file would be bundled into the client, secret key and all
describe('lib/api server actions', () => {
  const actionFiles = findActionFiles(join(process.cwd(), 'src/lib/api'));

  it('finds at least one actions.ts', () => {
    expect(actionFiles.length).toBeGreaterThan(0);
  });

  it.each(actionFiles)('%s starts with the use server directive', (file) => {
    const firstStatement = readFileSync(file, 'utf8').trimStart().split('\n')[0];

    expect(firstStatement).toMatch(/^['"]use server['"];?$/);
  });
});

function findActionFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findActionFiles(path);
    }

    return entry.name === 'actions.ts' ? [path] : [];
  });
}
