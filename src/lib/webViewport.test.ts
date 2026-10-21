import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountWebViewport } from './webViewport';

function browser(visual = true, touch = true) {
  vi.useFakeTimers();
  const css = new Map<string, string>();
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  const viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0, scale: 1 });
  const win = Object.assign(new EventTarget(), {
    innerHeight: 800, innerWidth: 390, visualViewport: visual ? viewport : null,
    matchMedia: () => ({ matches: touch }),
    getComputedStyle: () => ({ overflowY: 'auto' }),
    requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: (key: number) => frames.delete(key),
  });
  const scrollArea = { id: 'form', parentElement: null, scrollHeight: 1000, clientHeight: 480, scrollTop: 0, getBoundingClientRect: () => ({ top: 40, bottom: 520 }) };
  const field = { parentElement: scrollArea as typeof scrollArea | null, matches: () => true, getBoundingClientRect: () => ({ top: 660, bottom: 700 }), scrollIntoView: vi.fn() };
  const doc = Object.assign(new EventTarget(), {
    activeElement: null as typeof field | null,
    documentElement: { style: {
      getPropertyValue: (key: string) => css.get(key) ?? '',
      setProperty: (key: string, value: string) => css.set(key, value),
      removeProperty: (key: string) => css.delete(key),
    } },
  });
  const changed = vi.fn();
  const cleanup = mountWebViewport(win as unknown as Window, doc as unknown as Document, changed);
  const flush = () => {
    const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(0));
  };
  return { win, viewport, doc, field, scrollArea, css, frames, changed, cleanup, flush };
}

afterEach(() => vi.useRealTimers());

describe('browser viewport lifecycle', () => {
  it('follows expanded/collapsed browser chrome without treating it as a keyboard', () => {
    const b = browser();
    b.viewport.height = 720;
    b.viewport.dispatchEvent(new Event('resize')); b.flush();
    expect(b.css.get('--app-viewport-height')).toBe('720px');
    expect(b.css.get('--keyboard-inset')).toBe('0px');
    expect(b.changed).not.toHaveBeenCalled(); b.cleanup();
  });

  it('handles Safari visual-only keyboard shrink/pan and reveals only obscured fields', () => {
    const b = browser(); b.doc.activeElement = b.field;
    b.viewport.height = 480; b.viewport.offsetTop = 40;
    b.viewport.dispatchEvent(new Event('resize')); b.flush();
    expect(b.css.get('--app-viewport-height')).toBe('480px');
    expect(b.css.get('--app-viewport-offset-top')).toBe('40px');
    expect(b.css.get('--keyboard-inset')).toBe('280px');
    expect(b.changed).toHaveBeenLastCalledWith(true);
    expect(b.scrollArea.scrollTop).toBe(192);
    expect(b.field.scrollIntoView).not.toHaveBeenCalled();
    b.field.getBoundingClientRect = () => ({ top: 100, bottom: 140 });
    b.viewport.dispatchEvent(new Event('scroll')); b.flush();
    expect(b.scrollArea.scrollTop).toBe(192);
    expect(b.field.scrollIntoView).not.toHaveBeenCalled(); b.cleanup();
  });

  it('never scrolls the app root when the chat composer is focused during repeated keyboard resize/pan', () => {
    const b = browser(); b.doc.activeElement = b.field;
    b.scrollArea.id = 'root';
    for (const height of [600, 480, 450, 480]) {
      b.viewport.height = height; b.viewport.offsetTop = 40;
      b.viewport.dispatchEvent(new Event('resize')); b.flush();
    }
    expect(b.scrollArea.scrollTop).toBe(0);
    expect(b.field.scrollIntoView).not.toHaveBeenCalled();
    expect(b.css.get('--app-viewport-height')).toBe('480px');
    b.cleanup();
  });

  it.each([true, false])('supports layout-resizing keyboards (VisualViewport=%s)', visual => {
    const b = browser(visual); b.doc.activeElement = b.field;
    b.win.innerHeight = 480; b.viewport.height = 480;
    b.win.dispatchEvent(new Event('resize')); b.flush();
    expect(b.css.get('--keyboard-inset')).toBe('320px');
    expect(b.css.get('--app-viewport-height')).toBe('480px');
    b.doc.activeElement = null; b.win.innerHeight = 800; b.viewport.height = 800;
    b.win.dispatchEvent(new Event('resize')); b.flush();
    expect(b.css.get('--keyboard-inset')).toBe('0px');
    expect(b.changed).toHaveBeenLastCalledWith(false); b.cleanup();
  });

  it('does not mistake desktop window resizing or hardware keyboard focus for an OSK', () => {
    const b = browser(true, false); b.doc.activeElement = b.field;
    b.win.innerHeight = 500; b.viewport.height = 500;
    b.win.dispatchEvent(new Event('resize')); b.flush();
    expect(b.css.get('--keyboard-inset')).toBe('0px');
    expect(b.field.scrollIntoView).not.toHaveBeenCalled(); b.cleanup();
  });

  it('leaves pinch zoom and zoom panning to the browser without relayout or focus chasing', () => {
    const b = browser(); b.doc.activeElement = b.field;
    b.viewport.scale = 2; b.viewport.height = 400; b.viewport.offsetTop = 80;
    b.viewport.dispatchEvent(new Event('resize')); b.flush();
    expect(b.css.get('--app-viewport-height')).toBe('800px');
    expect(b.field.scrollIntoView).not.toHaveBeenCalled();
    expect(b.changed).not.toHaveBeenCalled(); b.cleanup();
  });

  it('coalesces scroll/resize events into one animation frame', () => {
    const b = browser();
    for (let i = 0; i < 20; i++) b.viewport.dispatchEvent(new Event('resize'));
    expect(b.frames.size).toBe(1); b.cleanup(); expect(b.frames.size).toBe(0);
  });

  it('resets geometry after orientation, fullscreen/pageshow and visibility changes', () => {
    const b = browser(); b.win.innerWidth = 800; b.win.innerHeight = 390; b.viewport.height = 390;
    b.win.dispatchEvent(new Event('orientationchange')); b.flush();
    expect(b.css.get('--app-viewport-height')).toBe('390px');
    b.win.innerHeight = 420; b.viewport.height = 420;
    b.win.dispatchEvent(new Event('pageshow')); b.doc.dispatchEvent(new Event('visibilitychange')); b.flush();
    expect(b.css.get('--app-viewport-height')).toBe('420px'); b.cleanup();
  });

  it('cleans listeners, settle timers, pending frames and restores pre-existing CSS', () => {
    const b = browser(); b.doc.activeElement = b.field;
    b.doc.dispatchEvent(new Event('focusin')); expect(vi.getTimerCount()).toBe(2);
    b.cleanup(); expect(vi.getTimerCount()).toBe(0); expect(b.css.size).toBe(0);
    b.win.dispatchEvent(new Event('resize')); expect(b.frames.size).toBe(0);
    b.css.set('--app-viewport-height', '70vh');
    const cleanup = mountWebViewport(b.win as unknown as Window, b.doc as unknown as Document, b.changed);
    cleanup(); expect(b.css.get('--app-viewport-height')).toBe('70vh');
  });
});
