// Types & Models
import type { ThemePreference, ThemeRequest, ThemeResponse, ThemeService } from '../types/theme';
import type { ThemeStore } from '../types/storage';

// Utilities & Helpers
import { reportFailure, reportDeliveryFailure, TrackingError } from '../runtime/errors';

export async function handleThemeRequest(
  message: ThemeRequest,
  store: ThemeStore,
  notify: (preference: ThemePreference) => void,
): Promise<ThemeResponse> {
  try {
    if (message.type === 'theme:get') {
      return { ok: true, preference: await store.read() };
    }
    await store.write(message.preference);
  } catch (cause) {
    const failure = cause instanceof TrackingError ? cause : new TrackingError('storage-failed', cause);
    return reportFailure(message.type, failure);
  }
  try {
    notify(message.preference);
  } catch (cause) {
    reportDeliveryFailure('Broadcast committed theme', cause);
  }
  return { ok: true, preference: message.preference };
}

export function createThemeService(store: ThemeStore, notify: (preference: ThemePreference) => void): ThemeService {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    handle(message) {
      const response = queue.then(() => handleThemeRequest(message, store, notify));
      queue = response.catch(cause => reportFailure('Handle theme request', cause));
      return response;
    },
  };
}
