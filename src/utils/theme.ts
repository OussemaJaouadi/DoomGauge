// Types & Models
import type { ThemePreference, ResolvedTheme, ThemeRequest, ThemeResponse } from '../types/theme';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === 'system') {
    return systemDark ? 'dark' : 'light';
  }
  return preference;
}

export function isThemeRequest(value: unknown): value is ThemeRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const message = value as Record<string, unknown>;
  return message.type === 'theme:get' || (message.type === 'theme:set' && isThemePreference(message.preference));
}

export function isThemeResponse(value: unknown): value is Extract<ThemeResponse, { ok: true }> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const response = value as Record<string, unknown>;
  return response.ok === true && isThemePreference(response.preference);
}
