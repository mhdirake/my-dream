import { describe, expect, it } from 'vitest';
import { conversationStatusFromEvent } from './conversationEvents';

describe('conversationStatusFromEvent', () => {
  it('reads the current backend top-level conversation payload', () => {
    expect(conversationStatusFromEvent({
      event: 'conversation.accepted',
      conversation: { id: 42, public_id: 'public-42', status: 'accepted' },
    }, 42, 'public-42')).toBe('accepted');
  });

  it('supports the versioned nested payload contract', () => {
    expect(conversationStatusFromEvent({
      event: 'conversation.accepted',
      payload: { conversation_id: 42, conversation_public_id: 'public-42' },
    }, 42, 'public-42')).toBe('accepted');
  });

  it('ignores events for another conversation', () => {
    expect(conversationStatusFromEvent({
      event: 'conversation.accepted',
      conversation: { id: 7, status: 'accepted' },
    }, 42, 'public-42')).toBeNull();
  });
});
