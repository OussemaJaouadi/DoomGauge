// Types & Models
import type { TrackingRequest, TrackingRequests, TrackingResponses } from '../types/tracking';

// Tokens & Meta
import { MAX_QUERY_RANGE_MS, MAX_TRACKING_ID_LENGTH } from '../config/tracking';

// Utilities & Helpers
import { validVisit } from './tracking';

export function parseTrackingRequest(value: unknown): TrackingRequest | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const message = value as Record<string, unknown>;
  switch (message.type) {
    case 'tracking:query': {
      const validRange = typeof message.start === 'number' && typeof message.end === 'number'
        && Number.isFinite(message.start) && Number.isFinite(message.end)
        && message.end > message.start && message.end - message.start <= MAX_QUERY_RANGE_MS;
      if (validRange) {
        return { type: message.type, start: message.start as number, end: message.end as number };
      }
      break;
    }
    case 'tracking:visit':
      if (validVisit(message.visit)) {
        return { type: message.type, visit: message.visit };
      }
      break;
    case 'tracking:heartbeat': {
      const validCollector = typeof message.collectorId === 'string'
        && message.collectorId.length > 0 && message.collectorId.length <= MAX_TRACKING_ID_LENGTH;
      if (validCollector && typeof message.observing === 'boolean') {
        return { type: message.type, collectorId: message.collectorId as string, observing: message.observing };
      }
      break;
    }
    case 'tracking:health':
      if (typeof message.failed === 'boolean') {
        return { type: message.type, failed: message.failed };
      }
  }
  return undefined;
}

function validStoredVisit(value: unknown): boolean {
  return validVisit(value) && 'tabId' in value && Number.isInteger(value.tabId)
    && 'documentId' in value && typeof value.documentId === 'string'
    && 'receivedAt' in value && Number.isFinite(value.receivedAt);
}

function validCoverage(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const interval = value as Record<string, unknown>;
  return typeof interval.id === 'string' && Number.isInteger(interval.tabId)
    && typeof interval.startTs === 'number' && Number.isFinite(interval.startTs)
    && typeof interval.endTs === 'number' && Number.isFinite(interval.endTs)
    && interval.endTs >= interval.startTs;
}

export function validTrackingResponse<K extends keyof TrackingRequests>(type: K, value: unknown): value is TrackingResponses[K] {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const response = value as Record<string, unknown>;
  if (response.ok !== true) {
    return false;
  }
  if (type === 'tracking:heartbeat') {
    return typeof response.focused === 'boolean';
  }
  if (type !== 'tracking:query') {
    return true;
  }
  const validVisits = Array.isArray(response.visits) && response.visits.every(validStoredVisit);
  const validIntervals = Array.isArray(response.coverage) && response.coverage.every(validCoverage);
  return typeof response.savingFailed === 'boolean' && validVisits && validIntervals;
}
