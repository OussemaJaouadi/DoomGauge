// Types & Models
import type { TrackingRequests, TrackingResponses } from '../types/tracking';

// Tokens & Meta
import { MESSAGE_TIMEOUT_MS } from '../config/runtime';

// Utilities & Helpers
import { validTrackingResponse } from '../utils/trackingMessages';
import { sendRequest } from '../runtime/messages';


export function sendTracking<K extends keyof TrackingRequests>(
  message: TrackingRequests[K] & { type: K },
  timeout = MESSAGE_TIMEOUT_MS,
): Promise<TrackingResponses[K]> {
  return sendRequest(message, (value): value is TrackingResponses[K] => validTrackingResponse(message.type, value), {
    timeout,
    retryUnavailable: message.type === 'tracking:query',
  });
}
