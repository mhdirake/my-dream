export interface KeyboardViewportMetrics {
  height: number;
  offsetTop: number;
  keyboardInset: number;
}

export function getKeyboardViewportMetrics(
  windowHeight: number,
  viewportHeight?: number,
  viewportOffsetTop = 0,
): KeyboardViewportMetrics {
  const fallback = Number.isFinite(windowHeight) && windowHeight > 0 ? windowHeight : 1;
  // Browsers can report zero/invalid intermediate values on resume/rotation.
  const height = Math.round(Number.isFinite(viewportHeight) && viewportHeight! > 0
    ? Math.min(viewportHeight!, fallback) : fallback);
  const offsetTop = Math.round(Number.isFinite(viewportOffsetTop)
    ? Math.min(Math.max(0, viewportOffsetTop), Math.max(0, fallback - height)) : 0);

  return {
    height,
    offsetTop,
    keyboardInset: Math.max(0, Math.round(fallback - height - offsetTop)),
  };
}
