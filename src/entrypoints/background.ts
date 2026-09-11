import { DEV_DATA } from '../config/dataMode';
import { installTrackingBackground } from "../tracking/background";
import { defineBackground } from 'wxt/utils/define-background';
import { handleThemeRequest, isThemeRequest } from '../theme/protocol';
import { readTheme, writeTheme } from '../theme/storage';
import { reportFailure, reportDeliveryFailure } from '../utils/errors';

export default defineBackground(() => {
  if (!DEV_DATA) installTrackingBackground();
  else void chrome.alarms.clear('tracking-maintenance').catch(cause => reportFailure('Clear maintenance alarm', cause));
  let queue: Promise<unknown> = Promise.resolve();
  chrome.runtime.onMessage.addListener((message: unknown, sender, reply) => {
    if (!isThemeRequest(message)) return false;
    // Preferences belong to extension pages, never injected website scripts.
    if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
    queue = queue.then(() => handleThemeRequest(message, { read: readTheme, write: writeTheme }, preference => {
      void chrome.runtime.sendMessage({ type: 'theme:changed', preference })
        .catch(cause => reportDeliveryFailure('Broadcast theme', cause));
    })).then(reply).catch(cause => reply(reportFailure('Handle theme request', cause)));
    return true;
  });
});
