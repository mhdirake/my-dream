import { describe, expect, it } from 'vitest';
import { replaceUnansweredPrompts } from './profilePrompts';

const shown = [1, 2, 3, 4, 5].map(id => ({ id, body: `Question ${id}` }));
const fresh = [6, 7, 8, 9, 10].map(id => ({ id, body: `Question ${id}` }));

describe('refreshing unanswered profile questions', () => {
  it('preserves answered questions in their original positions', () => {
    const answers = { 1: 'پاسخ من', 3: 'another answer' };
    const result = replaceUnansweredPrompts(shown, answers, fresh);
    expect(result.map(p => p.id)).toEqual([1, 6, 3, 7, 8]);
    expect(result[0]).toBe(shown[0]);
    expect(result[2]).toBe(shown[2]);
    expect(answers).toEqual({ 1: 'پاسخ من', 3: 'another answer' });
  });
  it('replaces all questions when every answer is blank', () => {
    expect(replaceUnansweredPrompts(shown, { 1: '  ', 2: '\n' }, fresh)).toEqual(fresh);
  });
  it('keeps existing blank questions if there are too few alternatives', () => {
    expect(replaceUnansweredPrompts(shown, { 1: 'answer' }, fresh.slice(0, 1)).map(p => p.id)).toEqual([1, 6, 3, 4, 5]);
  });
  it('ignores duplicates and questions already shown', () => {
    expect(replaceUnansweredPrompts(shown, {}, [shown[0], fresh[0], fresh[0], fresh[1]]).map(p => p.id)).toEqual([6, 7, 3, 4, 5]);
  });
  it('never replaces answered questions even if alternatives are returned', () => {
    expect(replaceUnansweredPrompts(shown, { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e' }, fresh)).toEqual(shown);
  });
});
