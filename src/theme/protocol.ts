import { isThemePreference, type ThemePreference } from './palette';
export type ThemeRequest = { type: 'theme:get' } | { type: 'theme:set'; preference: ThemePreference };
export type ThemeResponse = { ok: true; preference: ThemePreference } | { ok: false };
export function isThemeRequest(value: unknown): value is ThemeRequest {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return message.type === 'theme:get' || (message.type === 'theme:set' && isThemePreference(message.preference));
}
export async function handleThemeRequest(message: ThemeRequest, store: { read: () => Promise<ThemePreference>; write: (preference: ThemePreference) => Promise<void> }, notify: (preference: ThemePreference) => void): Promise<ThemeResponse> {
  try {
    if (message.type === 'theme:get') return { ok: true, preference: await store.read() };
    await store.write(message.preference);
    notify(message.preference);
    return { ok: true, preference: message.preference };
  } catch { return { ok: false }; }
}
