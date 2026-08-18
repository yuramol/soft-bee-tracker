'use client';

import type { QueryClient } from '@tanstack/react-query';

const storeResets = new Set<StoreReset>();

/**
 * Lets a store hand over its reset without this module importing the store.
 * `useSignOut` lives in `lib/api/auth/mutations`, which the auth store itself
 * depends on — importing the stores here would close that loop.
 *
 * Call it once, next to the store singleton.
 */
export function registerStoreReset(reset: StoreReset): void {
  storeResets.add(reset);
}

/**
 * Drops every piece of user-scoped state held in the browser.
 *
 * Logout navigates client-side, so the React tree survives it — and with it the query
 * cache and the module-level Zustand stores. Without an explicit reset the next account
 * to sign in on this tab starts out reading the previous account's data.
 */
export function resetClientState(queryClient: QueryClient): void {
  queryClient.clear();
  storeResets.forEach((reset) => reset());
}

type StoreReset = () => void;
