import { defineBackground } from 'wxt/utils/define-background';
import { handleThemeRequest, isThemeRequest } from '../theme/protocol';
import { readTheme, writeTheme } from '../theme/storage';

export default defineBackground(() => {
  let queue: Promise<unknown> = Promise.resolve();
  chrome.runtime.onMessage.addListener((message: unknown, sender, reply) => {
    if (!isThemeRequest(message)) return false;
    // Preferences belong to extension pages, never injected website scripts.
    if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
    queue = queue.then(() => handleThemeRequest(message, { read: readTheme, write: writeTheme }, preference => {
      void chrome.runtime.sendMessage({ type: 'theme:changed', preference }).catch(() => {});
    })).then(reply).catch(() => reply({ ok: false }));
    return true;
  });
});
