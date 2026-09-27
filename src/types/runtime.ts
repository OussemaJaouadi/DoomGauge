export interface MessageOptions {
  timeout?: number;
  retryUnavailable?: boolean;
}

export type CollectorProbe =
  | { status: 'responded'; visitId?: string }
  | { status: 'absent' | 'unknown' };

export interface TrackingChange {
  type: 'tracking:changed';
  start?: number;
  end?: number;
}
export type BackgroundNotice = { type: 'background:ready' } | TrackingChange;
