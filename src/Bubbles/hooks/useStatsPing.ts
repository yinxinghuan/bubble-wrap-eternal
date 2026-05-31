// Fire-and-forget pop events to the platform, throttled. Returns the
// (refreshable) aggregate stats so the header can show today's total.
//
// PLATFORM RULE in shared/runtime/useGameStats: re-fetch after every
// trigger. We coalesce that — refresh once every 5s if there were pops.

import { useCallback, useEffect, useRef } from 'react';
import { useGameEvent, useGameStats } from '@shared/runtime';

const EVENT = 'pop';
const REFETCH_INTERVAL_MS = 5_000;

export function useStatsPing() {
  const ev = useGameEvent();
  const { stats, refresh, loading } = useGameStats(EVENT);
  const dirtyRef = useRef(false);

  const ping = useCallback(() => {
    if (!ev.canEmit) return;
    ev.trigger(EVENT);
    dirtyRef.current = true;
  }, [ev]);

  useEffect(() => {
    if (!ev.canEmit) return;
    const t = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      refresh();
    }, REFETCH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [ev.canEmit, refresh]);

  return { ping, stats, loading };
}
