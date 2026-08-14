import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { getKeyboardViewportMetrics } from '@/lib/keyboardViewport';

const WEB_FOCUS_SETTLE_DELAYS = [0, 120, 320];

function isEditableElement(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  return element.matches('input, textarea, [contenteditable="true"]');
}

/**
 * Owns keyboard avoidance for the whole application.
 *
 * Native iOS needs padding because its window does not resize automatically.
 * Android relies on adjustResize by default, but that alone becomes unreliable
 * once edge-to-edge / a translucent status bar is involved (effectively the
 * default under Android 15+), so it also gets an explicit 'height' behavior
 * here as a JS-side fallback. Mobile browsers are synchronized with
 * visualViewport because their layout viewport often stays unchanged.
 */
export function KeyboardViewport({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const viewport = window.visualViewport;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const ensureFocusedFieldIsVisible = () => {
      if (!isEditableElement(document.activeElement)) return;
      document.activeElement.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest',
      });
    };

    const updateViewport = () => {
      const { height, offsetTop, keyboardInset } = getKeyboardViewportMetrics(
        window.innerHeight,
        viewport?.height,
        viewport?.offsetTop,
      );

      root.style.setProperty('--app-viewport-height', `${height}px`);
      root.style.setProperty('--app-viewport-offset-top', `${offsetTop}px`);
      root.style.setProperty('--keyboard-inset', `${keyboardInset}px`);

      if (isEditableElement(document.activeElement)) {
        requestAnimationFrame(ensureFocusedFieldIsVisible);
      }
    };

    const handleFocus = (event: FocusEvent) => {
      if (!isEditableElement(event.target as Element | null)) return;
      updateViewport();
      for (const delay of WEB_FOCUS_SETTLE_DELAYS) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          updateViewport();
          ensureFocusedFieldIsVisible();
        }, delay);
        timers.add(timer);
      }
    };

    const handleBlur = () => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        updateViewport();
      }, 80);
      timers.add(timer);
    };

    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
      for (const timer of timers) clearTimeout(timer);
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-viewport-offset-top');
      root.style.removeProperty('--keyboard-inset');
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding', android: 'height', default: undefined })}
      keyboardVerticalOffset={0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
});
