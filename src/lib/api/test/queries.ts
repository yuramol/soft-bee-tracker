'use client';

import { useQuery } from '@tanstack/react-query';

import type { TestItem } from '@/lib/api/test/types';
import type { ApiError } from '@/types/api-error';

const testItems: TestItem[] = [
  { id: '1', title: 'Review time entry', completed: false },
  { id: '2', title: 'Submit weekly report', completed: true },
  { id: '3', title: 'Sync project notes', completed: false }
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const testKeys = {
  all: ['test'] as const,
  lists: () => [...testKeys.all, 'list'] as const,
  list: () => [...testKeys.lists()] as const,
  details: () => [...testKeys.all, 'detail'] as const,
  detail: (id: string) => [...testKeys.details(), id] as const
};

export async function fetchTestItems(): Promise<TestItem[]> {
  await delay(300);
  return testItems.map((item) => ({ ...item }));
}

export async function fetchTestItem(id: string): Promise<TestItem> {
  await delay(200);

  const item = testItems.find((entry) => entry.id === id);

  if (!item) {
    throw {
      message: `Test item "${id}" was not found.`,
      statusCode: 404
    } satisfies ApiError;
  }

  return { ...item };
}

export function patchTestItem(id: string, completed: boolean): TestItem | undefined {
  const index = testItems.findIndex((entry) => entry.id === id);

  if (index === -1) {
    return undefined;
  }

  const updatedItem: TestItem = {
    ...testItems[index],
    completed
  };

  testItems[index] = updatedItem;

  return { ...updatedItem };
}

export function useTestItems() {
  return useQuery({
    queryKey: testKeys.list(),
    queryFn: fetchTestItems
  });
}

export function useTestItem(id: string) {
  return useQuery({
    queryKey: testKeys.detail(id),
    queryFn: () => fetchTestItem(id),
    enabled: Boolean(id)
  });
}
