declare function test(name: string, fn: () => void): void;
declare function expect(value: unknown): { toBe(value: unknown): void; toEqual(value: unknown): void };
import { dismissHintOnEscape, hintPosition } from '../utils/hintPosition';

test('hint stays inside left and right viewport edges', () => {
  const viewport = { width: 540, height: 580 }, size = { width: 310, height: 100 };
  expect(hintPosition({ left: 0, right: 22, top: 50, bottom: 72 }, size, viewport)).toEqual({ left: 12, top: 80 });
  expect(hintPosition({ left: 538, right: 560, top: 50, bottom: 72 }, size, viewport)).toEqual({ left: 218, top: 80 });
});
test('hint flips above a bottom trigger and clamps oversized content', () => {
  expect(hintPosition({ left: 300, right: 322, top: 550, bottom: 572 }, { width: 310, height: 100 }, { width: 540, height: 580 })).toEqual({ left: 12, top: 442 });
  expect(hintPosition({ left: 100, right: 122, top: 20, bottom: 42 }, { width: 900, height: 900 }, { width: 320, height: 300 })).toEqual({ left: 12, top: 12 });
});
test('Escape consumes the event before closing the hint, without leaking to the modal', () => {
  const calls: string[] = [];
  const event = { key: 'Escape', preventDefault: () => calls.push('prevent'), stopImmediatePropagation: () => calls.push('stop') };
  dismissHintOnEscape(event, () => calls.push('close'));
  expect(calls).toEqual(['prevent', 'stop', 'close']);
  dismissHintOnEscape({ ...event, key: 'Tab' }, () => calls.push('wrong'));
  expect(calls.length).toBe(3);
});
