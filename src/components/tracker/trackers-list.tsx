'use client';

import { useTrackers } from '@/lib/api/trackers';

export function TrackersList() {
  const { data: trackers, isLoading, error } = useTrackers();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>
    <h1>Trackers</h1>
    <ul>
      {trackers?.map((tracker) => (
        <li key={tracker.id}>{tracker.description}</li>
      ))}
    </ul>
  </div>;
}