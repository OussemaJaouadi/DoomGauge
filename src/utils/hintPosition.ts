export function hintPosition(anchor: { left: number; right: number; top: number; bottom: number }, size: { width: number; height: number }, viewport: { width: number; height: number }) {
  const gutter = 12, gap = 8;
  const width = Math.max(0, Math.min(size.width, viewport.width - gutter * 2));
  const height = Math.max(0, Math.min(size.height, viewport.height - gutter * 2));
  const left = Math.max(gutter, Math.min(anchor.right - width, viewport.width - gutter - width));
  const preferredTop = anchor.bottom + gap + height <= viewport.height - gutter ? anchor.bottom + gap : anchor.top - gap - height;
  return { left, top: Math.max(gutter, Math.min(preferredTop, viewport.height - gutter - height)) };
}
export function dismissHintOnEscape(event: Pick<KeyboardEvent, 'key' | 'preventDefault' | 'stopImmediatePropagation'>, close: () => void) {
  if (event.key !== 'Escape') return;
  event.preventDefault(); event.stopImmediatePropagation(); close();
}
