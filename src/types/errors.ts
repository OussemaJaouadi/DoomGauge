export type FailureCode = 'invalid-request' | 'storage-failed' | 'operation-failed' | 'background-unavailable' | 'timeout' | 'invalid-response';
export interface Failure { ok: false; code: FailureCode }
