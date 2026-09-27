// Types & Models
import type { MessageOptions } from '../types/runtime';

// Tokens & Meta
import { MESSAGE_TIMEOUT_MS, READ_RETRY_DELAYS_MS } from '../config/runtime';

// Utilities & Helpers
import { TrackingError } from './errors';
import { isFailure } from '../utils/failures';

function deliver(message: unknown, timeout: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TrackingError('timeout')), timeout);
    const sending = Promise.resolve().then(() => chrome.runtime.sendMessage(message));
    void sending.then(response => {
      clearTimeout(timer);
      resolve(response);
    }, cause => {
      clearTimeout(timer);
      const staleContext = cause instanceof Error && cause.message.includes('Extension context invalidated');
      reject(new TrackingError(staleContext ? 'extension-reloaded' : 'background-unavailable', cause));
    });
  });
}

export async function sendRequest<T>(
  message: unknown,
  validate: (value: unknown) => value is T,
  options: MessageOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? MESSAGE_TIMEOUT_MS;
  let response: unknown;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await deliver(message, timeout);
      break;
    } catch (cause) {
      const delay = READ_RETRY_DELAYS_MS[attempt];
      const retryRead = options.retryUnavailable && delay !== undefined
        && cause instanceof TrackingError && cause.code === 'background-unavailable';
      if (!retryRead) {
        throw cause;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  if (response && typeof response === 'object') {
    const result = response as Record<string, unknown>;
    if (isFailure(result)) {
      throw new TrackingError(result.code);
    }
  }
  if (!validate(response)) {
    throw new TrackingError('invalid-response');
  }
  return response;
}
