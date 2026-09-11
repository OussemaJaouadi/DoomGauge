import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { sendTracking } from './messages';
import { toObservation } from '../utils/trackingMeasurements';
import { TrackingQuery } from './query';

export function useTracking(start: number, end: number, enabled = true) {
  const query = useMemo(() => new TrackingQuery(() =>
    sendTracking({ type: 'tracking:query', start, end }, 8000)), [start, end]);
  const snapshot = useSyncExternalStore(query.subscribe, query.getSnapshot, query.getSnapshot);
  useEffect(() => {
    if (!enabled) return;
    void query.refresh();
    const read = () => {
      if (document.visibilityState === 'visible' && query.getSnapshot().status !== 'error') void query.refresh();
    };
    const timer = setInterval(read, 2000);
    document.addEventListener('visibilitychange', read);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', read);
    };
  }, [query, enabled]);
  const events = useMemo(() => snapshot.data.visits.map(toObservation), [snapshot.data.visits]);
  return {
    ...snapshot.data, events, status: snapshot.status, hasData: snapshot.hasData,
    refreshing: snapshot.refreshing, error: snapshot.error, retry: query.refresh,
  };
}
