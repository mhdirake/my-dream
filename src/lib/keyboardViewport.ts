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
  // In standalone WebKit, innerHeight can already match the shrunken visual
  // viewport while offsetTop still describes a pan in layout coordinates.
  // Neither value can be bounded by innerHeight without discarding that pan.
  const height = Math.max(1, Math.round(Number.isFinite(viewportHeight) && viewportHeight! > 0
    ? viewportHeight! : fallback));
  const offsetTop = Math.round(Number.isFinite(viewportOffsetTop)
    ? Math.max(0, viewportOffsetTop) : 0);

  return {
    height,
    offsetTop,
    keyboardInset: Math.max(0, Math.round(fallback - height - offsetTop)),
  };
}
