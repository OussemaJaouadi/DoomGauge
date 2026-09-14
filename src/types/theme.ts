// Types & Models
import type { Failure } from './errors';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';
export type ThemeRequest = { type: 'theme:get' } | { type: 'theme:set'; preference: ThemePreference };
export type ThemeResponse = { ok: true; preference: ThemePreference } | Failure;
export interface ThemeSnapshot {
  preference: ThemePreference;
  saving: boolean;
  error: boolean;
  failedOperation: 'read' | 'save' | null;
}

export interface ThemeService {
  handle: (message: ThemeRequest) => Promise<ThemeResponse>;
}
