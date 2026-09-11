import { isThemePreference, resolveTheme } from './palette';
import type { ThemePreference, ThemeRequest, ThemeResponse, ThemeSnapshot } from '../types/theme';
import { reportFailure, TrackingError } from '../utils/errors';

export class ThemeController {
  private snapshot: ThemeSnapshot = { preference: 'system', saving: false, error: false };
  private listeners = new Set<() => void>();
  private generation = 0;
  private pending: ThemePreference | undefined;
  refresh = () => this.apply(this.snapshot.preference);
  private queue: Promise<void> = Promise.resolve();
  constructor(private request: (message: ThemeRequest) => Promise<ThemeResponse>, private apply: (preference: ThemePreference) => void) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(next: ThemeSnapshot) { this.snapshot = next; this.apply(next.preference); this.listeners.forEach(listener => listener()); }
  async initialize() {
    const generation = this.generation;
    this.apply('system');
    try {
      const response = await this.request({ type: 'theme:get' });
      if (!response.ok) throw new TrackingError(response.code);
      if (generation === this.generation && response.ok && isThemePreference(response.preference)) this.update({ preference: response.preference, saving: false, error: false });
    } catch (cause) {
      reportFailure('Read theme preference', cause);
      if (generation === this.generation) this.update({ preference: 'system', saving: false, error: true });
    }
  }
  choose = (preference: ThemePreference) => {
    const generation = ++this.generation;
    this.update({ preference, saving: true, error: false });
    this.queue = this.queue.then(async () => {
      let ok = false;
      try {
        const response = await this.request({ type: 'theme:set', preference });
        if (!response.ok) throw new TrackingError(response.code);
        ok = true;
      } catch (cause) { reportFailure('Save theme preference', cause); }
      if (generation === this.generation) {
        this.update({ preference: ok ? this.pending ?? preference : preference, saving: false, error: !ok });
        this.pending = undefined;
      }
    });
    return this.queue;
  };
  receive = (preference: unknown) => {
    if (!isThemePreference(preference)) return;
    if (this.snapshot.saving) { this.pending = preference; return; }
    ++this.generation;
    this.update({ preference, saving: false, error: false });
  };
}
export { resolveTheme };
