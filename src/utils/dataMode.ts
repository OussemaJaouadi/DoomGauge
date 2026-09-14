// Types & Models
import type { DataMode } from '../types/config';

export function parseDataMode(value: unknown): DataMode {
  if (value === undefined || value === 'actual') {
    return 'actual';
  }
  if (value === 'dev') {
    return 'dev';
  }
  throw new Error('WXT_DATA_MODE must be dev or actual');
}
