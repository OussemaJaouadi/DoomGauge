import type { Platform } from './models';

export type UIState = 'loading' | 'success' | 'empty' | 'error';
export type Tab = 'today' | 'signals' | 'hourly';
export type View = { kind: 'tabs'; tab: Tab } | { kind: 'platform'; platform: Platform };
