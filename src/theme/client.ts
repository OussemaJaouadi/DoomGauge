import { ThemeController } from './controller';
import { resolveTheme, themePalettes, isThemePreference } from './palette';
import { isFailure, TrackingError } from '../utils/errors';
import type { ThemeRequest, ThemeResponse } from '../types/theme';

function request(message: ThemeRequest): Promise<ThemeResponse> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TrackingError('timeout')), 1500);
    Promise.resolve().then(() => chrome.runtime.sendMessage(message)).then(value => {
      clearTimeout(timer);
      if (value && typeof value === 'object' && (isFailure(value) || (value.ok === true && isThemePreference(value.preference)))) resolve(value);
      else reject(new TrackingError('invalid-response'));
    }, cause => {
      clearTimeout(timer);
      reject(new TrackingError('background-unavailable', cause));
    });
  });
}
const system = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
export const themeController = new ThemeController(request, preference => {
  if (typeof document === 'undefined') return;
  const theme = resolveTheme(preference, system?.matches ?? false);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  for (const [key, value] of Object.entries(themePalettes[theme])) root.style.setProperty(`--${key}`, value);
});

export async function initializeTheme() {
  // Root CSS has a System fallback; resolved tokens precede app rendering.
  system?.addEventListener('change', () => {
    if (themeController.getSnapshot().preference === 'system') themeController.refresh();
  });
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id === chrome.runtime.id && message?.type === 'theme:changed') themeController.receive(message.preference);
  });
  await themeController.initialize();
}
