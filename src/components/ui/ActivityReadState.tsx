import { createContext, useContext, type ReactNode } from 'react';
import { ErrorState } from './State';
import type { ActivityReadState } from '../../types/uiState';
const Context = createContext<ActivityReadState | undefined>(undefined);
export const useActivityReadState = () => useContext(Context);
export function ActivityReadProvider({ value, children }: { value?: ActivityReadState; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function ActivityReadNotice() {
  const read = useActivityReadState();
  if (!read || read.status !== 'error') return null;
  if (read.hasData) return <p className="activity-read-notice" role="status">Couldn’t refresh. Showing the last loaded view. <button type="button" onClick={read.retry}>Retry</button></p>;
  return <ErrorState title="Activity unavailable" hint={read.error ?? 'Local activity could not be read.'} action={{ label: 'Retry this view', onClick: read.retry }} />;
}
