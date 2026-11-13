import * as React from 'react';

import { getMsUntilNextLiveMinute } from '@/lib/live-tracker';

export function useLiveMinuteNow(startLiveDate: string | null): Date {
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    if (!startLiveDate) {
      return;
    }

    const anchor = startLiveDate;
    let timeoutId = 0;

    function scheduleNextTick() {
      timeoutId = window.setTimeout(handleTick, getMsUntilNextLiveMinute(anchor, new Date()) + TICK_BUFFER_MS);
    }

    function handleTick() {
      setNow(new Date());
      scheduleNextTick();
    }

    scheduleNextTick();

    return () => window.clearTimeout(timeoutId);
  }, [startLiveDate]);

  return now;
}

const TICK_BUFFER_MS = 50;
