import type { Platform } from './models';

export interface ActiveInterval { start: number; end: number }
export interface Visit {
  id: string;
  collectorId: string;
  platform: Platform;
  reelId?: string;
  startedAt: number;
  observedAt: number;
  activeMs: number;
  intervals: ActiveInterval[];
  revision: number;
  status: 'open' | 'completed' | 'interrupted';
  videoDurationMs?: number;
}
export interface StoredVisit extends Visit {
  tabId: number;
  documentId: string;
  receivedAt: number;
}
export interface Coverage { id: string; startTs: number; endTs: number; tabId: number }

export interface PlaybackState {
  focused: boolean;
  visible: boolean;
  intersecting: boolean;
  paused: boolean;
  ended: boolean;
  seeking: boolean;
  readyState: number;
  buffering?: boolean;
}

export interface TrackingData {
  visits: StoredVisit[];
  coverage: Coverage[];
  savingFailed: boolean;
}
export interface QuerySnapshot {
  data: TrackingData;
  status: 'loading' | 'success' | 'error';
  hasData: boolean;
  refreshing: boolean;
  error: string | null;
}

export interface TrackingRequests {
  'tracking:visit': { type: 'tracking:visit'; visit: Visit };
  'tracking:heartbeat': { type: 'tracking:heartbeat'; collectorId: string; observing: boolean };
  'tracking:health': { type: 'tracking:health'; failed: boolean };
  'tracking:query': { type: 'tracking:query'; start: number; end: number };
}
export interface TrackingResponses {
  'tracking:visit': { ok: true };
  'tracking:heartbeat': { ok: true; focused: boolean };
  'tracking:health': { ok: true };
  'tracking:query': { ok: true } & TrackingData;
}
export type TrackingRequest = TrackingRequests[keyof TrackingRequests];


export interface ReelCandidate {
  video: HTMLVideoElement;
  key: string;
  reelId?: string;
}

export interface CollectorHealth {
  tabId: number;
  lastHeartbeatAt: number;
  observing: boolean;
  coverageStart: number;
}
