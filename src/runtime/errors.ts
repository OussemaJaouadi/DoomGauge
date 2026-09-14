// Types & Models
import type { Failure, FailureCode } from '../types/errors';

// Tokens & Meta
import { FAILURE_MESSAGES } from '../config/errors';

export class TrackingError extends Error {
  constructor(readonly code: FailureCode, cause?: unknown) {
    super(FAILURE_MESSAGES[code], { cause });
  }
}

export function reportFailure(operation: string, cause: unknown): Failure {
  console.error(`[DoomGauge] ${operation}`, cause);
  return { ok: false, code: cause instanceof TrackingError ? cause.code : 'operation-failed' };
}

export function reportDeliveryFailure(operation: string, cause: unknown) {
  // Closed pages have no recipient; other delivery failures need diagnostics.
  if (cause instanceof Error && cause.message.includes('Receiving end does not exist')) {
    return;
  }
  reportFailure(operation, cause);
}
