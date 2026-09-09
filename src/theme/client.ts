import { ThemeController } from './controller';
import { resolveTheme, themePalettes } from './palette';
import type { ThemeRequest, ThemeResponse } from './protocol';

function request(message: ThemeRequest): Promise<ThemeResponse> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Theme request timed out')), 1500);
    Promise.resolve().then(() => chrome.runtime.sendMessage(message)).then(value => { clearTimeout(timer); resolve(value ?? { ok: false }); }, error => { clearTimeout(timer); reject(error); });
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
