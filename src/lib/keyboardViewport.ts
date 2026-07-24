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
  const height = Math.max(0, Math.round(viewportHeight ?? windowHeight));
  const offsetTop = Math.max(0, Math.round(viewportOffsetTop));

  return {
    height,
    offsetTop,
    keyboardInset: Math.max(0, Math.round(windowHeight - height - offsetTop)),
  };
}
