// Types & Models
import type { BackgroundNotice } from '../types/runtime';

export function isBackgroundNotice(value: unknown, sender: chrome.runtime.MessageSender, extensionId: string): value is BackgroundNotice {
  if (sender.id !== extensionId || sender.tab || !value || typeof value !== 'object') {
    return false;
  }
  const notice = value as Record<string, unknown>;
  if (notice.type === 'background:ready') {
    return true;
  }
  if (notice.type !== 'tracking:changed') {
    return false;
  }
  if (notice.start === undefined && notice.end === undefined) {
    return true;
  }
  return typeof notice.start === 'number' && Number.isFinite(notice.start)
    && typeof notice.end === 'number' && Number.isFinite(notice.end) && notice.end >= notice.start;
}
