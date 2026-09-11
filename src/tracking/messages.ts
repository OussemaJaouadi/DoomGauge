import { validVisit } from '../utils/tracking';
import type { TrackingRequests, TrackingResponses } from '../types/tracking';
import { isFailure, TrackingError } from '../utils/errors';

function validResponse(type: keyof TrackingRequests, value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  if (response.ok !== true) return false;
  if (type === 'tracking:heartbeat') return typeof response.focused === 'boolean';
  if (type !== 'tracking:query') return true;
  return typeof response.savingFailed === 'boolean'
    && Array.isArray(response.visits) && response.visits.every(visit =>
      validVisit(visit) && 'tabId' in visit && Number.isInteger(visit.tabId)
      && 'documentId' in visit && typeof visit.documentId === 'string'
      && 'receivedAt' in visit && Number.isFinite(visit.receivedAt))
    && Array.isArray(response.coverage) && response.coverage.every(interval =>
      interval && typeof interval.id === 'string' && Number.isInteger(interval.tabId)
      && Number.isFinite(interval.startTs) && Number.isFinite(interval.endTs)
      && interval.endTs >= interval.startTs);
}

export function sendTracking<K extends keyof TrackingRequests>(message: TrackingRequests[K] & { type: K }, timeout = 3000): Promise<TrackingResponses[K]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TrackingError('timeout')), timeout);
    Promise.resolve().then(() => chrome.runtime.sendMessage(message)).then(response => {
      clearTimeout(timer);
      if (response && typeof response === 'object' && isFailure(response)) {
        reject(new TrackingError(response.code));
      } else if (!validResponse(message.type, response)) {
        reject(new TrackingError('invalid-response'));
      } else {
        resolve(response);
      }
    }, cause => {
      clearTimeout(timer);
      reject(new TrackingError('background-unavailable', cause));
    });
  });
}
