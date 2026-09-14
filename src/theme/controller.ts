// Types & Models
import type { ThemePreference, ThemeRequest, ThemeResponse, ThemeSnapshot } from '../types/theme';

// Utilities & Helpers
import { isThemePreference } from '../utils/theme';
import { reportFailure, TrackingError } from '../runtime/errors';

export class ThemeController {
  private snapshot: ThemeSnapshot = { preference: 'system', saving: false, error: false, failedOperation: null };
  private listeners = new Set<() => void>();
  private generation = 0;
  private pending: ThemePreference | undefined;
  refresh = () => this.apply(this.snapshot.preference);
  private queue: Promise<void> = Promise.resolve();
  private reading: Promise<void> | undefined;
  private initialized = false;

  constructor(
    private request: (message: ThemeRequest) => Promise<ThemeResponse>,
    private apply: (preference: ThemePreference) => void,
  ) {}

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(next: ThemeSnapshot): void {
    this.snapshot = next;
    this.apply(next.preference);
    for (const listener of this.listeners) {
      listener();
    }
  }

  initialize(): Promise<void> {
    this.refresh();
    if (this.reading) {
      return this.reading;
    }
    if (this.initialized) {
      return Promise.resolve();
    }
    this.reading = this.readPreference().finally(() => {
      this.reading = undefined;
    });
    return this.reading;
  }

  private async readPreference(): Promise<void> {
    const generation = this.generation;
    try {
      const response = await this.request({ type: 'theme:get' });
      if (!response.ok) {
        throw new TrackingError(response.code);
      }
      this.initialized = true;
      if (generation === this.generation) {
        this.update({ preference: response.preference, saving: false, error: false, failedOperation: null });
      }
    } catch (cause) {
      reportFailure('Read theme preference', cause);
      if (generation === this.generation) {
        this.update({ ...this.snapshot, error: true, failedOperation: 'read' });
      }
    }
  }

  retry = (): Promise<void> => {
    if (this.snapshot.failedOperation === 'save') {
      return this.choose(this.snapshot.preference);
    }
    return this.initialize();
  };

  choose = (preference: ThemePreference) => {
    const generation = ++this.generation;
    this.pending = undefined;
    this.update({ preference, saving: true, error: false, failedOperation: null });
    this.queue = this.queue.then(async () => {
      let ok = false;
      try {
        const response = await this.request({ type: 'theme:set', preference });
        if (!response.ok) {
          throw new TrackingError(response.code);
        }
        ok = true;
        this.initialized = true;
      } catch (cause) {
        reportFailure('Save theme preference', cause);
      }
      if (generation === this.generation) {
        this.update({
          preference: ok ? this.pending ?? preference : preference,
          saving: false,
          error: !ok,
          failedOperation: ok ? null : 'save',
        });
        this.pending = undefined;
      }
    });
    return this.queue;
  };
  receive = (preference: unknown) => {
    if (!isThemePreference(preference)) {
      return;
    }
    if (this.snapshot.failedOperation === 'save') {
      return;
    }
    if (this.snapshot.saving) {
      this.pending = preference;
      return;
    }
    ++this.generation;
    this.initialized = true;
    this.update({ preference, saving: false, error: false, failedOperation: null });
  };
}
