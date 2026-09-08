import { validMockLimit } from '../components/settings/SettingsPage';
declare function test(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void };

test('mock thresholds accept only positive whole numbers within bounds', () => {
  for (const value of ['', ' ', '0', '-1', '1.5', 'NaN', 'Infinity', '10001']) expect(validMockLimit(value, 10000)).toBe(false);
  for (const value of ['1', '100', '10000']) expect(validMockLimit(value, 10000)).toBe(true);
  expect(validMockLimit('1440', 1440)).toBe(true);
  expect(validMockLimit('1441', 1440)).toBe(false);
});
