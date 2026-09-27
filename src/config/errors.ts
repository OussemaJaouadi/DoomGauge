// Types & Models
import type { FailureCode } from '../types/errors';

export const FAILURE_MESSAGES: Record<FailureCode, string> = {
  'invalid-request': 'The extension rejected this request.',
  'storage-failed': 'Local storage is unavailable. Retry this view.',
  'operation-failed': 'The operation failed. Retry this view.',
  'background-unavailable': 'The extension background is unavailable. Retry this view.',
  'extension-reloaded': 'The extension was reloaded. Close this page and reopen it from the extension icon.',
  timeout: 'The request took too long. Retry this view.',
  'invalid-response': 'The background returned an invalid response. Reload the extension, then retry.',
};
