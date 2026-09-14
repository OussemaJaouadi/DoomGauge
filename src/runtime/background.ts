// Types & Models
import type { ThemePreference } from '../types/theme';

// Tokens & Meta
import { MAINTENANCE_ALARM, MAINTENANCE_MINUTES } from '../config/tracking';

// Utilities & Helpers
import { TrackingService } from '../tracking/service';
import { handleTrackingMessage, installTrackingBackground } from '../tracking/background';
import { createThemeService } from '../theme/service';
import { readTheme, writeTheme } from '../storage/preferenceRepository';
import { closeLocalDatabase } from '../storage/database';
import { isThemeRequest } from '../utils/theme';
import { reportFailure, reportDeliveryFailure, TrackingError } from './errors';

let installed: (() => void) | undefined;

function broadcastTheme(preference: ThemePreference): void {
  void chrome.runtime.sendMessage({ type: 'theme:changed', preference })
    .catch(cause => reportDeliveryFailure('Broadcast theme', cause));
}

export function startBackground(devData: boolean): () => void {
  if (installed) {
    return installed;
  }
  const theme = createThemeService({ read: readTheme, write: writeTheme }, broadcastTheme);
  const tracking = devData ? undefined : new TrackingService();

  const onMessage = (message: unknown, sender: chrome.runtime.MessageSender, reply: (value: unknown) => void) => {
    if (!message || typeof message !== 'object' || !('type' in message)) {
      return false;
    }
    if (message.type === 'theme:get' || message.type === 'theme:set') {
      const extensionPage = sender.id === chrome.runtime.id && sender.url?.startsWith(chrome.runtime.getURL(''));
      if (!extensionPage || !isThemeRequest(message)) {
        reply({ ok: false, code: 'invalid-request' });
        return false;
      }
      void theme.handle(message).then(reply, cause => reply(reportFailure('Handle theme request', cause)));
      return true;
    }
    const trackingMessage = typeof message.type === 'string' && message.type.startsWith('tracking:');
    if (trackingMessage) {
      if (!tracking) {
        reply({ ok: false, code: 'invalid-request' });
        return false;
      }
      void handleTrackingMessage(message, sender, tracking)
        .then(reply, cause => reply(reportFailure('Handle tracking request', cause)));
      return true;
    }
    return false;
  };

  // Theme and activity share a receiver registered before any maintenance work.
  chrome.runtime.onMessage.addListener(onMessage);
  const stopTracking = tracking ? installTrackingBackground(tracking) : undefined;
  let stopped = false;
  installed = () => {
    if (stopped) {
      return;
    }
    stopped = true;
    chrome.runtime.onMessage.removeListener(onMessage);
    stopTracking?.();
    tracking?.stop();
    installed = undefined;
    void closeLocalDatabase().catch(cause => reportFailure('Close local database', cause));
  };

  const maintain = async () => {
    if (stopped) {
      return;
    }
    if (tracking) {
      await chrome.alarms.create(MAINTENANCE_ALARM, { periodInMinutes: MAINTENANCE_MINUTES });
      if (!stopped) {
        await tracking.runMaintenance();
      }
    } else {
      await chrome.alarms.clear(MAINTENANCE_ALARM);
    }
  };
  void Promise.resolve().then(maintain).catch(cause => {
    reportFailure('Start background maintenance', new TrackingError('operation-failed', cause));
  });
  return installed;
}
