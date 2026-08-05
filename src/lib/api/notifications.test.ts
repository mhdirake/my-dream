import { describe, expect, it } from 'vitest';
import { type AppNotification, isGroupMessageNotification } from './notifications';

function notification(
  type: string,
  metadata: Record<string, unknown> | null,
): AppNotification {
  return {
    id: 1,
    type,
    title: null,
    body: null,
    related_user: null,
    metadata,
    read_at: null,
    created_at: '2026-08-05T10:00:00.000Z',
  };
}

describe('isGroupMessageNotification', () => {
  it('hides message notifications explicitly marked as group conversations', () => {
    expect(isGroupMessageNotification(
      notification('chat_message_created', { conversation_type: 'group' }),
    )).toBe(true);
  });

  it('uses known group conversation ids when metadata only contains an id', () => {
    expect(isGroupMessageNotification(
      notification('new_message', { conversation_id: 42 }),
      new Set([42]),
    )).toBe(true);
  });

  it('keeps direct message notifications', () => {
    expect(isGroupMessageNotification(
      notification('message_received', { conversation_type: 'direct', conversation_id: 7 }),
      new Set([42]),
    )).toBe(false);
  });

  it('keeps important conversation events even when they relate to a group', () => {
    expect(isGroupMessageNotification(
      notification('conversation_request_accepted', { conversation_type: 'group' }),
    )).toBe(false);
  });

  it('recognizes explicit group-message notification types', () => {
    expect(isGroupMessageNotification(
      notification('group_message_received', null),
    )).toBe(true);
  });
});
