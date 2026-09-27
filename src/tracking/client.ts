// React & 3rd-party
import { useEffect, useMemo, useSyncExternalStore } from 'react';

// Tokens & Meta
import { QUERY_TIMEOUT_MS } from '../config/runtime';

// Utilities & Helpers
import { sendTracking } from './messages';
import { toObservation } from '../utils/trackingMeasurements';
import { TrackingQuery } from './query';
import { watchTracking } from './subscription';

export function useTracking(start: number, end: number, enabled = true) {
  const query = useMemo(() => new TrackingQuery(() =>
    sendTracking({ type: 'tracking:query', start, end }, QUERY_TIMEOUT_MS)), [start, end]);
  const snapshot = useSyncExternalStore(query.subscribe, query.getSnapshot, query.getSnapshot);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    return watchTracking(query, start, end);
  }, [query, enabled, start, end]);
  const events = useMemo(() => snapshot.data.visits.map(toObservation), [snapshot.data.visits]);
  return {
    ...snapshot.data, events, status: snapshot.status, hasData: snapshot.hasData,
    refreshing: snapshot.refreshing, error: snapshot.error, retry: query.refresh,
  };
}
