import { isThemePreference } from './palette';
import type { ThemePreference, ThemeRequest, ThemeResponse } from '../types/theme';
import { reportFailure, reportDeliveryFailure, TrackingError } from '../utils/errors';
export function isThemeRequest(value: unknown): value is ThemeRequest {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return message.type === 'theme:get' || (message.type === 'theme:set' && isThemePreference(message.preference));
}
export async function handleThemeRequest(message: ThemeRequest, store: { read: () => Promise<ThemePreference>; write: (preference: ThemePreference) => Promise<void> }, notify: (preference: ThemePreference) => void): Promise<ThemeResponse> {
  try {
    if (message.type === 'theme:get') return { ok: true, preference: await store.read() };
    await store.write(message.preference);
  } catch (cause) { return reportFailure(message.type, new TrackingError('storage-failed', cause)); }
  try { notify(message.preference); }
  catch (cause) { reportDeliveryFailure('Broadcast committed theme', cause); }
  return { ok: true, preference: message.preference };
}
