import { PLATFORMS, type Platform } from '../types/models';
export interface ActiveInterval { start: number; end: number }
export interface Visit {
  id: string; collectorId: string; platform: Platform; reelId?: string;
  startedAt: number; observedAt: number; activeMs: number; intervals: ActiveInterval[];
  revision: number; status: 'open' | 'completed' | 'interrupted'; videoDurationMs?: number;
}
export interface StoredVisit extends Visit { tabId: number; documentId: string; receivedAt: number }
export interface Coverage { id: string; startTs: number; endTs: number; tabId: number }
export const CHECKPOINT_MS = 2000;
export const MAX_SAMPLE_GAP_MS = 1500;
export function validVisit(value: unknown): value is Visit {
  if (!value || typeof value !== 'object') return false;
  const v = value as Visit;
  if (typeof v.id !== 'string' || !v.id.length || v.id.length > 100 || typeof v.collectorId !== 'string' || !v.collectorId.length || v.collectorId.length > 100 || !PLATFORMS.includes(v.platform)) return false;
  if (!Number.isSafeInteger(v.revision) || v.revision < 1 || !['open','completed','interrupted'].includes(v.status)) return false;
  if (![v.startedAt,v.observedAt,v.activeMs].every(Number.isFinite) || v.startedAt < 0 || v.observedAt > 8640000000000000 || v.observedAt < v.startedAt || v.activeMs < 0 || v.activeMs > v.observedAt-v.startedAt+1) return false;
  if (v.reelId !== undefined && (typeof v.reelId !== 'string' || v.reelId.length > 200)) return false;
  if (v.videoDurationMs !== undefined && (!Number.isFinite(v.videoDurationMs) || v.videoDurationMs <= 0)) return false;
  if (!Array.isArray(v.intervals) || v.intervals.length > 20000) return false;
  let end=v.startedAt, total=0;
  for (const i of v.intervals) {
    if (!i || !Number.isFinite(i.start) || !Number.isFinite(i.end) || i.start < end || i.end < i.start || i.end > v.observedAt) return false;
    total+=i.end-i.start; end=i.end;
  }
  return Math.abs(total-v.activeMs)<1;
}
export function acceptRevision(old: StoredVisit | undefined, next: StoredVisit) {
  if (!old) return true;
  if (old.tabId!==next.tabId || old.documentId!==next.documentId || old.collectorId!==next.collectorId || old.platform!==next.platform || old.startedAt!==next.startedAt) throw new Error('Visit ownership mismatch');
  if (next.revision<=old.revision) return false;
  if (old.status==='completed' || next.observedAt<old.observedAt || next.activeMs<old.activeMs) throw new Error('Non-monotonic visit');
  for(let i=0;i<old.intervals.length;i++) {
    const prior=old.intervals[i]!, current=next.intervals[i];
    if(!current || current.start!==prior.start || current.end<prior.end || (i<old.intervals.length-1 && current.end!==prior.end)) throw new Error('Recorded intervals cannot be rewritten');
  }
  return true;
}
export function intervalMs(intervals: readonly ActiveInterval[], start=-Infinity, end=Infinity) { return intervals.reduce((sum,i)=>sum+Math.max(0,Math.min(end,i.end)-Math.max(start,i.start)),0); }
export function canAccumulate(state:{focused:boolean;visible:boolean;intersecting:boolean;paused:boolean;ended:boolean;seeking:boolean;readyState:number;buffering?:boolean}) {
  return state.focused&&state.visible&&state.intersecting&&!state.paused&&!state.ended&&!state.seeking&&!state.buffering&&state.readyState>=3;
}
