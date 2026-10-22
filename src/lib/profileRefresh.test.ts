import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchProfileResume } from './profileRefresh';

const native = vi.hoisted(() => ({
  platform: { OS: 'web' }, currentState: 'active',
  listener: null as null | ((state: string) => void), remove: vi.fn(),
}));
vi.mock('react-native', () => ({
  Platform: native.platform,
  AppState: {
    get currentState() { return native.currentState; },
    addEventListener: (_: string, listener: (state: string) => void) => {
      native.listener = listener;
      return { remove: native.remove };
    },
  },
}));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); native.platform.OS = 'web'; native.currentState = 'active'; });

function setup() {
  const win = new EventTarget();
  const doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  const refresh = vi.fn();
  const cleanup = watchProfileResume(refresh);
  return { win, doc, refresh, cleanup };
}

describe('profile refresh when an installed web app resumes', () => {
  it('refreshes when the web app returns to view or receives focus', () => {
    const app = setup();
    app.doc.dispatchEvent(new Event('visibilitychange'));
    app.win.dispatchEvent(new Event('focus'));
    expect(app.refresh).toHaveBeenCalledTimes(2);
    app.cleanup();
  });
  it('does not fetch while the app is hidden or backgrounded', () => {
    const app = setup();
    app.doc.hidden = true;
    app.doc.dispatchEvent(new Event('visibilitychange'));
    app.win.dispatchEvent(new Event('focus'));
    expect(app.refresh).not.toHaveBeenCalled();
    app.doc.hidden = false;
    native.currentState = 'background';
    app.win.dispatchEvent(new Event('focus'));
    expect(app.refresh).not.toHaveBeenCalled();
    app.cleanup();
  });
  it('removes listeners when the profile screen loses focus', () => {
    const app = setup();
    app.cleanup();
    app.win.dispatchEvent(new Event('focus'));
    app.doc.dispatchEvent(new Event('visibilitychange'));
    expect(app.refresh).not.toHaveBeenCalled();
    expect(native.remove).toHaveBeenCalledOnce();
  });
  it('refreshes native apps only when they become active', () => {
    native.platform.OS = 'android';
    const app = setup();
    native.listener?.('background');
    expect(app.refresh).not.toHaveBeenCalled();
    native.listener?.('active');
    expect(app.refresh).toHaveBeenCalledOnce();
    app.win.dispatchEvent(new Event('focus'));
    expect(app.refresh).toHaveBeenCalledOnce();
    app.cleanup();
  });
});
