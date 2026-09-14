// Utilities & Helpers
import { parseDataMode } from '../utils/dataMode';

export const DATA_MODE = parseDataMode(import.meta.env?.WXT_DATA_MODE);
export const DEV_DATA = DATA_MODE === 'dev';
