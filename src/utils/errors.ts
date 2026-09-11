import type { Failure, FailureCode } from '../types/errors';

const descriptions: Record<FailureCode, string> = {
  'invalid-request': 'The extension rejected this request.',
  'storage-failed': 'Local storage is unavailable. Retry this view.',
  'operation-failed': 'The operation failed. Retry this view.',
  'background-unavailable': 'The extension background is unavailable. Reload the extension, then retry.',
  timeout: 'The background did not respond. Retry this view.',
  'invalid-response': 'The background returned an invalid response. Reload the extension, then retry.',
};

export class TrackingError extends Error {
  constructor(readonly code: FailureCode, cause?: unknown) {
    super(descriptions[code], { cause });
  }
}

export function reportFailure(operation: string, cause: unknown): Failure {
  console.error(`[DoomGauge] ${operation}`, cause);
  return { ok: false, code: cause instanceof TrackingError ? cause.code : 'operation-failed' };
}

export function isFailure(value: Record<string, unknown>): value is Record<string, unknown> & Failure {
  return value.ok === false && typeof value.code === 'string' && Object.hasOwn(descriptions, value.code);
}

export function reportDeliveryFailure(operation: string, cause: unknown) {
  // Closed pages have no recipient; other delivery failures need diagnostics.
  if (cause instanceof Error && cause.message.includes('Receiving end does not exist')) return;
  reportFailure(operation, cause);
}
