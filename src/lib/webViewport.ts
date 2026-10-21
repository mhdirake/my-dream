import { getKeyboardViewportMetrics } from './keyboardViewport';

const SETTLE_DELAYS = [120, 320];
const KEYBOARD_THRESHOLD = 100;

function editable(element: Element | null): element is HTMLElement {
  return !!element?.matches(
    'textarea:not([readonly]):not([disabled]), input:not([readonly]):not([disabled]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"]), [contenteditable="true"]',
  );
}

/** Reveal form fields without panning the fixed app window or chat composer. */
function revealField(win: Window, doc: Document, field: HTMLElement, top: number, bottom: number) {
  for (let parent = field.parentElement; parent && parent !== doc.body && parent !== doc.documentElement; parent = parent.parentElement) {
    if (parent.id === 'root') break;
    if (!/^(auto|scroll)$/.test(win.getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight) continue;
    const bounds = parent.getBoundingClientRect();
    const rect = field.getBoundingClientRect();
    const visibleTop = Math.max(top, bounds.top) + 12;
    const visibleBottom = Math.min(bottom, bounds.bottom) - 12;
    const delta = rect.bottom > visibleBottom ? rect.bottom - visibleBottom
      : rect.top < visibleTop ? rect.top - visibleTop : 0;
    parent.scrollTop = Math.max(0, Math.min(parent.scrollHeight - parent.clientHeight, parent.scrollTop + delta));
    break;
  }
}

/** One owner for browser viewport sizing, including portals outside #root. */
export function mountWebViewport(win: Window, doc: Document, onKeyboard: (visible: boolean) => void) {
  const viewport = win.visualViewport;
  const style = doc.documentElement.style;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const properties = ['--app-viewport-height', '--app-viewport-offset-top', '--keyboard-inset'];
  const previous = properties.map(name => style.getPropertyValue(name));
  let frame: number | undefined;
  let restingHeight = win.innerHeight;
  let width = win.innerWidth;
  let keyboardVisible = false;

  const update = () => {
    frame = undefined;
    // Pinch zoom is not a keyboard. Let the browser pan/zoom the stable layout.
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) return;
    const focused = editable(doc.activeElement);
    if (width !== win.innerWidth) {
      width = win.innerWidth;
      restingHeight = win.innerHeight;
    } else if (!focused) {
      restingHeight = win.innerHeight;
    }
    const metrics = getKeyboardViewportMetrics(win.innerHeight, viewport?.height, viewport?.offsetTop);
    const touch = win.matchMedia?.('(any-pointer: coarse)').matches ?? false;
    const obstruction = focused ? Math.max(metrics.keyboardInset, touch ? restingHeight - win.innerHeight : 0) : 0;
    const inset = obstruction >= KEYBOARD_THRESHOLD ? obstruction : 0;
    style.setProperty(properties[0], `${metrics.height}px`);
    style.setProperty(properties[1], `${metrics.offsetTop}px`);
    style.setProperty(properties[2], `${inset}px`);
    if (keyboardVisible !== (inset > 0)) {
      keyboardVisible = inset > 0;
      onKeyboard(keyboardVisible);
    }
    const field = doc.activeElement;
    if (editable(field) && inset > 0) {
      const rect = field.getBoundingClientRect();
      if (rect.top < metrics.offsetTop + 12 || rect.bottom > metrics.offsetTop + metrics.height - 12) {
        revealField(win, doc, field, metrics.offsetTop, metrics.offsetTop + metrics.height);
      }
    }
  };
  const schedule = () => {
    if (frame === undefined) frame = win.requestAnimationFrame(update);
  };
  const settle = () => {
    schedule();
    for (const delay of SETTLE_DELAYS) {
      const timer = setTimeout(() => { timers.delete(timer); schedule(); }, delay);
      timers.add(timer);
    }
  };
  const sources: [EventTarget, string, EventListener][] = [
    [win, 'resize', schedule], [win, 'orientationchange', settle], [win, 'pageshow', settle],
    [doc, 'visibilitychange', settle], [doc, 'focusin', settle], [doc, 'focusout', settle],
  ];
  if (viewport) sources.push([viewport, 'resize', schedule], [viewport, 'scroll', schedule]);
  sources.forEach(([target, event, listener]) => target.addEventListener(event, listener));
  update();
  return () => {
    sources.forEach(([target, event, listener]) => target.removeEventListener(event, listener));
    for (const timer of timers) clearTimeout(timer);
    if (frame !== undefined) win.cancelAnimationFrame(frame);
    properties.forEach((name, index) => previous[index]
      ? style.setProperty(name, previous[index]) : style.removeProperty(name));
  };
}
