import React from 'react';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompatibilitySummary } from './CompatibilitySummary';
import { COMPATIBILITY_DISCLAIMER, normalizeCompatibility } from '@/lib/discovery/compatibility';

const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as {
  renderToStaticMarkup: (node: React.ReactNode) => string;
};

vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: unknown) => styles },
  Text: ({ children, style, accessibilityLabel }: React.PropsWithChildren<{ style: React.CSSProperties; accessibilityLabel?: string }>) =>
    React.createElement('span', { style, 'aria-label': accessibilityLabel }, children),
  View: ({ children, style, accessibilityLiveRegion }: React.PropsWithChildren<{ style: React.CSSProperties; accessibilityLiveRegion?: 'polite' }>) =>
    React.createElement('div', { style, 'aria-live': accessibilityLiveRegion }, children),
}));
vi.stubGlobal('React', React);
afterEach(() => { vi.restoreAllMocks(); });

const context = { viewerId: 1, candidateId: 2, day: '2026-10-22', tier: 'gold' };
const ready = { status: 'ready', tier: 'gold', score_type: 'advanced', score: 0,
  viewer_id: 1, candidate_id: 2, day: context.day, snapshot_id: '1', algorithm_version: 'md049-v2', goal_matrix_version: 'goals-v1',
  reason_text: 'هدف رابطه نزدیک است.', reason_codes: [], reason_details: ['توضیح بلند و مجاز درباره عوامل مشترک پیشنهاد که باید بدون حذف متن به صورت خوانا نمایش داده شود.'] };

describe('shared Daily/Profile compatibility summary', () => {
  it('renders a genuine ready zero rather than hiding or fabricating it', () => {
    const output = renderToStaticMarkup(React.createElement(CompatibilitySummary, { compatibility: normalizeCompatibility(ready, context) }));
    expect(output).toContain('۰٪');
    expect(output).toContain('هدف رابطه نزدیک است.');
    expect(output).toContain('تضمین موفقیت رابطه');
  });
  it('renders insufficient-data state without turning it into zero percent', () => {
    const output = renderToStaticMarkup(React.createElement(CompatibilitySummary, {
      compatibility: normalizeCompatibility({ ...ready, status: 'insufficient_data', score: null }, context),
    }));
    expect(output).toContain('اطلاعات کافی');
    expect(output).not.toContain('۰٪');
  });
  it('shows Basic text without any percentage or raw legacy explanation', () => {
    const output = renderToStaticMarkup(React.createElement(CompatibilitySummary, {
      compatibility: normalizeCompatibility({ ...ready, tier: 'basic', score_type: 'basic', status: 'text_only', score: 99,
        explanation: { private_score: 99 } }, { ...context, tier: 'basic' }), detailed: true,
    }));
    expect(output).not.toContain('٪');
    expect(output).not.toContain('private_score');
    expect(output).toContain(ready.reason_text);
    expect(output).toContain(ready.reason_details[0]);
  });
  it.each(['basic', 'gold'] as const)('renders the shared disclaimer once in %s details even if the backend supplies it', tier => {
    const snapshot = normalizeCompatibility({ ...ready, tier, status: tier === 'basic' ? 'text_only' : 'ready',
      score_type: tier === 'basic' ? 'basic' : 'advanced',
      reason_details: [...ready.reason_details, COMPATIBILITY_DISCLAIMER, ` ${COMPATIBILITY_DISCLAIMER} `],
    }, { ...context, tier });
    const output = renderToStaticMarkup(React.createElement(CompatibilitySummary, { compatibility: snapshot, detailed: true }));
    expect(output.split(COMPATIBILITY_DISCLAIMER)).toHaveLength(2);
    expect(output).toContain(ready.reason_details[0]);
    if (tier === 'basic') expect(output).not.toContain('٪');
  });
  it('uses the identical approved reason for card/details and does not truncate RTL details', () => {
    const snapshot = normalizeCompatibility(ready, context);
    const card = renderToStaticMarkup(React.createElement(CompatibilitySummary, { compatibility: snapshot }));
    const details = renderToStaticMarkup(React.createElement(CompatibilitySummary, { compatibility: snapshot, detailed: true }));
    expect(card).toContain(ready.reason_text);
    expect(details).toContain(ready.reason_text);
    expect(details).toContain(ready.reason_details[0]);
    expect(details).toContain('writing-direction:rtl');
  });
});
