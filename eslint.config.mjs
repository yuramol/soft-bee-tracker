import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

const eslintConfig = defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    '.history/**',
    'supabase/**',
    '.yarn/**',
    'playwright-report/**',
    'test-results/**',
    'blob-report/**',
    'src/types/supabase-schema.ts'
  ]),
  ...nextVitals,
  ...nextTs,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  prettierRecommended,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'no-useless-escape': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      'prettier/prettier': 'error'
    }
  },
  {
    // Client-reachable layers must never import server-only modules (secret key, next/headers).
    files: ['src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}', 'src/providers/**/*.{ts,tsx}', 'src/lib/api/**/*.{ts,tsx}'],
    // actions.ts holds 'use server' functions: they run only on the server, and
    // client code imports them as references, so they may use server modules
    ignores: ['src/lib/api/**/server.ts', 'src/lib/api/**/actions.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next/headers',
              allowTypeImports: true,
              message: 'next/headers is server-only: use it from server components, route handlers or server.ts helpers only.'
            }
          ],
          patterns: [
            {
              regex: '^(?:@/|@lib/|\\.{1,2}/)(?:.*/)?server$',
              allowTypeImports: true,
              message: 'Server-only module: import it from server components, route handlers or server.ts helpers only.'
            }
          ]
        }
      ]
    }
  }
]);

export default eslintConfig;
