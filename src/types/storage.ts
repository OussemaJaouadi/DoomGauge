// Types & Models
import type { Coverage, StoredVisit } from './tracking';
import type { ThemePreference } from './theme';

export type OpenDatabase = () => Promise<IDBDatabase>;

export interface ActivityRecords {
  visits: StoredVisit[];
  coverage: Coverage[];
}

export interface ThemeStore {
  read: () => Promise<ThemePreference>;
  write: (preference: ThemePreference) => Promise<void>;
}

export type DayKey = number | 'spanning';
export interface IndexedVisit extends StoredVisit {
  rangeDays: DayKey[];
}
export interface IndexedCoverage extends Coverage {
  rangeDays: DayKey[];
}
