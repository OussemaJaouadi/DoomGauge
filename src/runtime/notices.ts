// Types & Models
import type { BackgroundNotice } from '../types/runtime';

// Utilities & Helpers
import { reportDeliveryFailure } from './errors';

export function broadcastNotice(notice: BackgroundNotice): void {
  void Promise.resolve().then(() => chrome.runtime.sendMessage(notice)).catch(cause => {
    reportDeliveryFailure(notice.type, cause);
  });
}
