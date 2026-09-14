// Types & Models
import type { ThemePreference } from '../types/theme';
import type { OpenDatabase } from '../types/storage';

// Utilities & Helpers
import { isThemePreference } from '../utils/theme';
import { requestResult, runTransaction, openLocalDatabase } from './database';

export function readTheme(open: OpenDatabase = openLocalDatabase): Promise<ThemePreference> {
  return runTransaction(['preferences'], 'readonly', async transaction => {
    const preference = await requestResult(transaction.objectStore('preferences').get('theme'));
    return isThemePreference(preference) ? preference : 'system';
  }, open);
}

export function writeTheme(preference: ThemePreference, open: OpenDatabase = openLocalDatabase): Promise<void> {
  return runTransaction(['preferences'], 'readwrite', async transaction => {
    transaction.objectStore('preferences').put(preference, 'theme');
  }, open);
}
