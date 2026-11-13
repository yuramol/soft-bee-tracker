'use client';

import { ErrorState } from '@components/common/error-state/error-state';
import content from './content.json';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  function handleRetry() {
    reset();
  }

  return <ErrorState title={content.error.title} error={{ message: error.message }} onRetry={handleRetry} />;
}
