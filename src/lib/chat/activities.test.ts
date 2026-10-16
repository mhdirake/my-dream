import { describe, expect, it } from 'vitest';
import { ACTIVITY_TTL, activitySummary, updateActivities } from './activities';

describe('live chat activities', () => {
  it('tracks concurrent actors independently and ignores self echo', () => {
    const first = updateActivities([], { user_id: 1 }, 9, 100);
    const second = updateActivities(first, { user_id: 2, activity: 'recording' }, 9, 200);
    expect(updateActivities(second, { user_id: 9 }, 9, 250)).toEqual(second);
    expect(second).toEqual([
      { userId: 1, kind: 'typing', expiresAt: 100 + ACTIVITY_TTL },
      { userId: 2, kind: 'recording', expiresAt: 200 + ACTIVITY_TTL },
    ]);
  });
  it('switches activity and does not let an old typing stop clear recording', () => {
    let items = updateActivities([], { UserID: 1 }, 9, 100);
    items = updateActivities(items, { user_id: 1, activity: 'recording' }, 9, 200);
    items = updateActivities(items, { user_id: 1, activity: 'typing', active: false }, 9, 250);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('recording');
    expect(updateActivities(items, { user_id: 1, activity: 'recording', active: false }, 9, 300)).toEqual([]);
  });
  it('expires stale actors independently and rejects invalid input', () => {
    let items = updateActivities([], { user_id: 1 }, 9, 0);
    items = updateActivities(items, { user_id: 2 }, 9, 1000);
    items = updateActivities(items, { user_id: 'bad', activity: 'recording' }, 9, ACTIVITY_TTL);
    expect(items.map(item => item.userId)).toEqual([2]);
    expect(updateActivities([], { user_id: 1, activity: 'unknown' }, 9, 100)).toEqual([]);
  });
  it('shows at most three named activities and adds ellipsis for the rest', () => {
    const items = [1, 2, 3, 4].reduce((prev, user_id) => updateActivities(prev, { user_id, activity: user_id === 2 ? 'recording' : 'typing' }, 9, 100), [] as ReturnType<typeof updateActivities>);
    const text = activitySummary(items, id => ['علی', 'مریم', 'سارا', 'رضا'][id - 1]);
    expect(text).toBe('علی در حال تایپ، مریم در حال ضبط صدا، سارا در حال تایپ، ...');
    expect(activitySummary(items.slice(0, 3), id => `name${id}`)).not.toContain('...');
    expect(activitySummary([], () => '')).toBe('');
  });
});
