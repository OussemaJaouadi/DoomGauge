import type { Platform } from './models';

export type UIState = 'loading' | 'success' | 'empty' | 'error';
export type Tab = 'today' | 'signals' | 'hourly';
export type View = { kind: 'tabs'; tab: Tab } | { kind: 'platform'; platform: Platform };

/** Preview-only observations; does not change the production event protocol. */
export interface PopupMockView {
  completed?: boolean;
  skipped?: boolean;
  countInScope?: boolean;
  id: string;
  platform: Platform;
  startedAt: number;
  endedAt: number;
  activeMs: number;
  videoDurationMs?: number;
}

export interface PopupActivitySession {
  id: string;
  startedAt: number;
  endedAt: number;
  activeMs: number;
  reelCount: number;
  platforms: Platform[];
}
