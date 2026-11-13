const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isLocalSupabaseUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) {
    return false;
  }

  try {
    const parsed = new URL(rawUrl);
    return LOCAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function isNonLocalUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) {
    return false;
  }

  return !isLocalSupabaseUrl(rawUrl);
}

export function assertTestEnvironmentIsolated(rawUrl: string | undefined, context = 'test'): void {
  if (!isLocalSupabaseUrl(rawUrl)) {
    throw new Error(
      `Unsafe Supabase URL in ${context} environment (${rawUrl ?? 'undefined'}). Automated tests must target a local instance (localhost or 127.0.0.1) so production is never modified.`
    );
  }
}

export function assertServerExecutionContext(callerName = 'createServiceClient'): void {
  if (typeof window !== 'undefined') {
    throw new Error(`${callerName} is server-only and must never be called in a browser environment.`);
  }
}
