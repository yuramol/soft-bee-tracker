import { isNonLocalUrl } from '@/lib/supabase/env-safeguards';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SECRET_KEY = 'test-secret-key';

const originalFetch = globalThis.fetch;

function resolveTargetUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

async function guardedTestFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const targetUrl = resolveTargetUrl(input);

  if (isNonLocalUrl(targetUrl)) {
    throw new Error(`Blocked outbound request in unit test to non-local URL: ${targetUrl}. Tests must never contact production.`);
  }

  return originalFetch(input, init);
}

globalThis.fetch = guardedTestFetch;
