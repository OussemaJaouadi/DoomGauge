// Types & Models
import type { ThemeRequest, ThemeResponse } from '../types/theme';

// Tokens & Meta
import { themePalettes } from '../components/tokens';
import { THEME_TIMEOUT_MS } from '../config/runtime';

// Utilities & Helpers
import { ThemeController } from './controller';
import { resolveTheme, isThemeResponse } from '../utils/theme';
import { sendRequest } from '../runtime/messages';
import { reportFailure } from '../runtime/errors';

function request(message: ThemeRequest): Promise<ThemeResponse> {
  return sendRequest(message, isThemeResponse, {
    timeout: THEME_TIMEOUT_MS,
    retryUnavailable: message.type === 'theme:get',
  });
}

let system: MediaQueryList | undefined;
let active = true;
export const themeController = new ThemeController(request, preference => {
  if (!active || typeof document === 'undefined') {
    return;
  }
  const theme = resolveTheme(preference, system?.matches ?? false);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  for (const [key, value] of Object.entries(themePalettes[theme])) {
    root.style.setProperty(`--${key}`, value);
  }
});

let listening = false;

function onSystemChange(): void {
  if (themeController.getSnapshot().preference === 'system') {
    themeController.refresh();
  }
}

function onThemeMessage(message: unknown, sender: chrome.runtime.MessageSender): void {
  const trustedSender = sender.id === chrome.runtime.id;
  if (!trustedSender || !message || typeof message !== 'object') {
    return;
  }
  if ('type' in message && message.type === 'theme:changed' && 'preference' in message) {
    themeController.receive(message.preference);
  }
}

/** Applies fallback before returning; background reads never block mounting. */
export function initializeTheme(): Promise<void> {
  active = true;
  if (!system && typeof matchMedia === 'function') {
    system = matchMedia('(prefers-color-scheme: dark)');
  }
  if (!listening) {
    try {
      chrome.runtime.onMessage.addListener(onThemeMessage);
      system?.addEventListener('change', onSystemChange);
      listening = true;
    } catch (cause) {
      reportFailure('Listen for theme updates', cause);
    }
  }
  return themeController.initialize();
}

export function disposeTheme(): void {
  active = false;
  if (!listening) {
    return;
  }
  system?.removeEventListener('change', onSystemChange);
  system = undefined;
  chrome.runtime.onMessage.removeListener(onThemeMessage);
  listening = false;
}

if (import.meta.hot) {
  import.meta.hot.dispose(disposeTheme);
}
