// Types & Models
import type { Failure } from '../types/errors';

// Tokens & Meta
import { FAILURE_MESSAGES } from '../config/errors';

export function isFailure(value: Record<string, unknown>): value is Record<string, unknown> & Failure {
  return value.ok === false && typeof value.code === 'string' && Object.hasOwn(FAILURE_MESSAGES, value.code);
}
