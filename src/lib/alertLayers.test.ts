import { describe, expect, it } from 'vitest';
import { AlertLayers } from './alertLayers';

describe('alert window priority', () => {
  it('keeps alerts above nested native modals and restores the previous window', () => {
    const layers = new AlertLayers<string>();
    layers.register('root', true);
    layers.set('error', 'failed');
    const closeFirst = layers.register('first');
    const closeSecond = layers.register('second');
    expect(layers.getSnapshot().host).toBe('second');
    expect(layers.getSnapshot().entries.get('error')).toBe('failed');
    closeSecond();
    expect(layers.getSnapshot().host).toBe('first');
    closeFirst();
    expect(layers.getSnapshot().host).toBe('root');
  });

  it('does not let a late root registration override an open modal', () => {
    const layers = new AlertLayers<string>();
    layers.register('modal');
    layers.register('root', true);
    expect(layers.getSnapshot().host).toBe('modal');
  });

  it('does not lose alerts when a non-top modal closes', () => {
    const layers = new AlertLayers<string>();
    const close = layers.register('first');
    layers.register('second');
    layers.set('confirmation', 'confirm');
    close();
    expect(layers.getSnapshot().host).toBe('second');
    layers.remove('confirmation');
    expect(layers.getSnapshot().entries.size).toBe(0);
  });
});
