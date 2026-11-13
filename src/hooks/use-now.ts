import * as React from 'react';

export function useNow(isTicking: boolean, intervalMs = 1000): Date {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    if (!isTicking) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(new Date()), intervalMs);

    return () => window.clearInterval(intervalId);
  }, [isTicking, intervalMs]);

  return now;
}
