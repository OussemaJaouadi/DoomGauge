export type DataMode = 'dev' | 'actual';
export function parseDataMode(value: unknown): DataMode {
  if (value === undefined || value === 'actual') return 'actual';
  if (value === 'dev') return 'dev';
  throw new Error('WXT_DATA_MODE must be dev or actual');
}
export const DATA_MODE = parseDataMode(import.meta.env?.WXT_DATA_MODE);
export const DEV_DATA = DATA_MODE === 'dev';
