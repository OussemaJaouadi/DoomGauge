import { useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { themeController } from './client';
import type { ThemePreference } from '../types/theme';

export function ThemeControl() {
  const state = useSyncExternalStore(themeController.subscribe, themeController.getSnapshot, themeController.getSnapshot);
  const choices = [{ value: 'system', label: 'System', icon: <Monitor size={16} /> }, { value: 'light', label: 'Light', icon: <Sun size={16} /> }, { value: 'dark', label: 'Dark', icon: <Moon size={16} /> }] as const;
  return <section className="settings-appearance" aria-labelledby="appearance-heading">
    <div><h2 id="appearance-heading">Appearance</h2><p>Shared by popup and telemetry.</p></div>
    <div className="analysis-choices theme-choices" role="group" aria-label="Color theme">{choices.map(choice => <button key={choice.value} type="button" aria-pressed={state.preference === choice.value} onClick={() => void themeController.choose(choice.value as ThemePreference)}>{choice.icon}{choice.label}</button>)}</div>
    <span role="status" className="theme-save-status">{state.saving ? 'Saving…' : state.error ? <>Theme preference unavailable. Using {state.preference}. <button type="button" onClick={() => void themeController.choose(state.preference)}>Save this choice</button></> : ''}</span>
  </section>;
}
