export type FailureCode = 'invalid-request' | 'storage-failed' | 'operation-failed' | 'background-unavailable' | 'extension-reloaded' | 'timeout' | 'invalid-response';
export interface Failure { ok: false; code: FailureCode }
