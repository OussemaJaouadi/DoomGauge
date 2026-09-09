import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { UIState } from '../../types/popup';
import { emptyMessages, retryOverrides, type DataPreset, type EmptyReason, type StateOverride } from './stateModel';
import './States.css';

interface Region { label: string; reasons: readonly EmptyReason[] }
interface PreviewContext {
  overrides: Record<string, StateOverride>; preset: DataPreset;
  register: (id: string, region: Region) => () => void;
  retry: (id: string) => void;
  regions: Record<string, Region>;
  setOverride: (id: string, state: StateOverride) => void;
  setPreset: (preset: DataPreset) => void;
  reset: () => void;
}
const noop = () => {};
const Context = createContext<PreviewContext>({ overrides: {}, preset: 'normal', register: () => noop, retry: noop, regions: {}, setOverride: noop, setPreset: noop, reset: noop });
export const useStatePreview = () => useContext(Context);
export function StatePreviewProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, StateOverride>>({});
  const [preset, setPreset] = useState<DataPreset>('normal');
  const [regions, setRegions] = useState<Record<string, Region>>({});
  const register = useCallback((id: string, region: Region) => {
    if (!import.meta.env?.DEV) return noop;
    setRegions(current => ({ ...current, [id]: region }));
    return () => setRegions(current => { const next = { ...current }; delete next[id]; return next; });
  }, []);
  const retry = useCallback((id: string) => setOverrides(current => retryOverrides(current, id)), []);
  const setOverride = useCallback((id: string, state: StateOverride) => setOverrides(current => ({ ...current, [id]: state })), []);
  return <Context.Provider value={{ overrides, preset, regions, register, retry, setOverride, setPreset, reset: () => { setOverrides({}); setPreset('normal'); } }}>{children}</Context.Provider>;
}

export function StatePreviewControls({ scope }: { scope?: string }) {
  const preview = useStatePreview();
  const [requestedTarget, setTarget] = useState('page');
  if (!import.meta.env?.DEV) return null;
  const regions = Object.entries(preview.regions).filter(([id]) => !scope || id.startsWith(scope));
  const target = regions.some(([id]) => id === requestedTarget) ? requestedTarget : 'page';
  const state = preview.overrides[target] ?? { status: 'success' };
  const reasons: readonly EmptyReason[] = target === 'page' ? ['activity', 'filters', 'history', 'followup', 'unobserved'] : preview.regions[target]?.reasons ?? ['activity'];
  const reason = state.reason && reasons.includes(state.reason) ? state.reason : reasons[0]!;
  return <details className="state-preview-controls"><summary>States <small>dev</small></summary><div>
    <label>Target<select value={target} onChange={event => setTarget(event.target.value)}><option value="page">Whole page</option>{regions.map(([id, region]) => <option key={id} value={id}>{region.label}</option>)}</select></label>
    <div className="state-preview-buttons" role="group" aria-label="Preview state">{(['success', 'loading', 'empty', 'error'] as UIState[]).map(status => <button type="button" key={status} aria-pressed={state.status === status} onClick={() => preview.setOverride(target, { status, reason })}>{status === 'success' ? 'Normal' : status}</button>)}</div>
    {state.status === 'empty' && <label>Reason<select value={reason} onChange={event => preview.setOverride(target, { status: 'empty', reason: event.target.value as EmptyReason })}>{reasons.map(value => <option key={value} value={value}>{emptyMessages[value].title}</option>)}</select></label>}
    {!scope && <label>Data fixture<select value={preview.preset} onChange={event => { preview.reset(); preview.setPreset(event.target.value as DataPreset); }}><option value="normal">Normal</option><option value="zero">Observed zero</option><option value="filtered">No filter matches</option><option value="insufficient">Insufficient history / coverage</option><option value="previousOnly">Previous period only</option></select></label>}
    <button type="button" onClick={preview.reset}>Reset previews</button>
  </div></details>;
}
