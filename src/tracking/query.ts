import type { TrackingData, QuerySnapshot } from '../types/tracking';
import { reportFailure } from '../utils/errors';

const emptyData = (): TrackingData => ({ visits: [], coverage: [], savingFailed: false });

/** One range, one in-flight read. Refresh retains successful snapshots. */
export class TrackingQuery {
  private snapshot: QuerySnapshot = {
    data: emptyData(), status: 'loading', hasData: false, refreshing: false, error: null,
  };
  private listeners = new Set<() => void>();
  private pending: Promise<void> | undefined;
  constructor(private request: () => Promise<TrackingData>) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(patch: Partial<QuerySnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }

  private async readSnapshot(): Promise<void> {
    try {
      const data = await this.request();
      this.update({
        data,
        status: 'success',
        hasData: true,
        refreshing: false,
        error: null,
      });
    } catch (cause) {
      reportFailure('Read activity', cause);
      const error = cause instanceof Error ? cause.message : 'Local activity could not be read.';
      this.update({ status: 'error', refreshing: false, error });
    } finally {
      this.pending = undefined;
    }
  }

  refresh = (): Promise<void> => {
    if (this.pending) {
      return this.pending;
    }
    // Defer execution until the in-flight promise is assigned, including synchronous failures.
    this.pending = Promise.resolve().then(() => this.readSnapshot());
    this.update({
      status: this.snapshot.hasData ? 'success' : 'loading',
      refreshing: true,
      error: null,
    });
    return this.pending;
  };
}
