import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { assertTestEnvironmentIsolated, isLocalSupabaseUrl, isNonLocalUrl } from '@/lib/supabase/env-safeguards';
import { createServiceClient } from '@/lib/supabase/server';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../..');
const srcRoot = path.resolve(repoRoot, 'src');
const TYPE_ONLY_IMPORT_PATTERN = /^\s*import\s+type\s[^;]*;/gm;
const NAMED_IMPORT_PATTERN = /^\s*import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]\s*;?/gm;

function stripTypeOnlyImports(content: string): string {
  return content
    .replace(TYPE_ONLY_IMPORT_PATTERN, '')
    .replace(NAMED_IMPORT_PATTERN, (statement: string, specifiers: string) => (hasOnlyTypeSpecifiers(specifiers) ? '' : statement));
}

function hasOnlyTypeSpecifiers(specifiers: string): boolean {
  const names = specifiers
    .split(',')
    .map((specifier) => specifier.trim())
    .filter(Boolean);

  return names.length > 0 && names.every((name) => /^type\s/.test(name));
}

function collectSourceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function hasUseClientDirective(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"');
}

describe('configuration and secret safeguards', () => {
  afterEach(() => {
    delete (globalThis as { window?: object }).window;
  });

  it('keeps server-side keys out of frontend and client modules', () => {
    // Keep in sync with the client-layer `files` list of the restricted-imports rule in eslint.config.mjs.
    const alwaysClientPaths = [
      path.join(srcRoot, 'components'),
      path.join(srcRoot, 'hooks'),
      path.join(srcRoot, 'providers'),
      path.join(srcRoot, 'lib', 'api')
    ];

    const explicitClientFiles = [path.join(srcRoot, 'lib', 'supabase', 'client.ts'), path.join(srcRoot, 'lib', 'supabase', 'index.ts')];

    const allSrcFiles = collectSourceFiles(srcRoot);
    const useClientFiles = allSrcFiles.filter((filePath) => hasUseClientDirective(fs.readFileSync(filePath, 'utf8')));

    // lib/api/**/actions.ts may import server modules only while it is a real
    // server action ('use server'), matching the eslint exemption
    const isServerAction = (filePath: string) =>
      filePath.startsWith(path.join(srcRoot, 'lib', 'api') + path.sep) &&
      path.basename(filePath) === 'actions.ts' &&
      /^\s*['"]use server['"]/.test(fs.readFileSync(filePath, 'utf8'));

    const isServerHelper = (filePath: string) =>
      (filePath.startsWith(path.join(srcRoot, 'lib') + path.sep) && path.basename(filePath) === 'server.ts') || isServerAction(filePath);

    const clientFileSet = new Set<string>(
      [...explicitClientFiles, ...alwaysClientPaths.flatMap((dir) => collectSourceFiles(dir)), ...useClientFiles].filter(
        (filePath) => !isServerHelper(filePath)
      )
    );

    const forbiddenPatterns = [
      /SUPABASE_SECRET_KEY/,
      /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE)/i,
      /sb_secret_[A-Za-z0-9_-]+/,
      /(?:from|import\()\s*['"](?:@\/|@lib\/|(?:\.{1,2}\/)+)(?:[^'"]*\/)?server['"]/,
      /(?:from|import\()\s*['"]next\/headers['"]/
    ];

    const violations: string[] = [];

    for (const filePath of clientFileSet) {
      const content = stripTypeOnlyImports(fs.readFileSync(filePath, 'utf8'));
      const relativePath = path.relative(repoRoot, filePath);

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push(`${relativePath} matched forbidden client pattern ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('ignores type-only server imports the same way the ESLint rule does', () => {
    expect(stripTypeOnlyImports("import type { UserProfile } from '@/lib/api/auth/server';")).toBe('');
    expect(stripTypeOnlyImports("import { type UserProfile, type Role } from '@/lib/api/auth/server';")).toBe('');
    expect(stripTypeOnlyImports("import {\n  type UserProfile\n} from './server';")).toBe('');

    const mixedImport = "import { type UserProfile, getProfile } from '@/lib/api/auth/server';";
    expect(stripTypeOnlyImports(mixedImport)).toBe(mixedImport);
  });

  it('ensures .example.env and .gitignore protect environment secrets', () => {
    const exampleEnv = fs.readFileSync(path.join(repoRoot, '.example.env'), 'utf8');
    const gitignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');

    expect(exampleEnv).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]*SECRET/i);
    expect(exampleEnv).not.toMatch(/sb_secret_|sb_publishable_|supabase\.co/);
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('.env.*');
  });

  it('prevents createServiceClient from running in a browser context', () => {
    (globalThis as { window?: object }).window = {};

    expect(() => createServiceClient()).toThrow(/server-only/i);
  });

  it('isolates automated test actions from production Supabase instances', async () => {
    expect(() => assertTestEnvironmentIsolated('https://example-project.supabase.co', 'unit-test')).toThrow(
      /production is never modified/i
    );
    expect(() => assertTestEnvironmentIsolated(undefined, 'unit-test')).toThrow(/production is never modified/i);
    expect(() => assertTestEnvironmentIsolated('http://localhost.example.com', 'unit-test')).toThrow(/production is never modified/i);
    expect(() => assertTestEnvironmentIsolated('http://127.0.0.1:54321', 'unit-test')).not.toThrow();

    await expect(fetch('https://example-project.supabase.co/rest/v1/projects')).rejects.toThrow(/Blocked outbound request in unit test/i);
  });

  it('treats unparsable URLs as non-local (fail closed)', () => {
    expect(isLocalSupabaseUrl('not a url')).toBe(false);
    expect(isNonLocalUrl('not a url')).toBe(true);
    expect(isNonLocalUrl('http://[::1]:54321')).toBe(false);
  });
});
