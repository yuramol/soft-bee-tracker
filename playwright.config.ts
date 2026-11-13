import { defineConfig, devices } from '@playwright/test';

import { assertTestEnvironmentIsolated } from './src/lib/supabase/env-safeguards';

const E2E_PORT = 3100;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

const e2eSupabaseUrl = process.env.PLAYWRIGHT_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const e2eAnonKey = process.env.PLAYWRIGHT_SUPABASE_ANON_KEY ?? 'e2e-placeholder-anon-key';
const e2eSecretKey = process.env.PLAYWRIGHT_SUPABASE_SECRET_KEY ?? 'e2e-canary-secret-must-never-reach-client';

process.env.E2E_SECRET_CANARY = e2eSecretKey;

assertTestEnvironmentIsolated(e2eSupabaseUrl, 'playwright');

if (process.env.CI) {
  // CI serves a prebuilt bundle (`yarn start`): NEXT_PUBLIC_* were inlined at `yarn build`,
  // so webServer.env cannot override them — the build-time URL must match the E2E one.
  assertTestEnvironmentIsolated(process.env.NEXT_PUBLIC_SUPABASE_URL, 'playwright (production build)');

  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== e2eSupabaseUrl) {
    throw new Error(
      `PLAYWRIGHT_SUPABASE_URL (${e2eSupabaseUrl}) differs from build-time NEXT_PUBLIC_SUPABASE_URL (${process.env.NEXT_PUBLIC_SUPABASE_URL}); the prebuilt bundle would ignore it.`
    );
  }
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: process.env.CI ? `yarn start --port ${E2E_PORT}` : `yarn dev --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: e2eSupabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: e2eAnonKey,
      SUPABASE_SECRET_KEY: e2eSecretKey
    }
  }
});
