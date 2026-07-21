import { describe, expect, it } from 'vitest';
import type { Message } from '@/lib/api/chat';
import { mergeMessages, messageFromOutbox } from './timeline';

function message(overrides: Partial<Message>): Message {
  return {
    message_id: 'message-1',
    client_message_id: 'client-1',
    conversation_id: 'conversation-1',
    conversation_type: 'direct',
    sender_user_id: 1,
    message_type: 'text',
    body_text: 'hello',
    caption: '',
    media_url: '',
    sticker_id: '',
    gif_id: '',
    gift_id: 0,
    sent_gift_id: 0,
    reply_to_message_id: null,
    status: 'sent',
    is_edited: false,
    is_deleted: false,
    created_at: '2026-07-21T10:00:00.000Z',
    ...overrides,
  };
}

describe('mergeMessages', () => {
  it('replaces an optimistic message with the canonical acknowledgement', () => {
    const optimistic = message({ message_id: 'optimistic-client-1', status: 'sending' });
    const acknowledged = message({ message_id: 'server-1', status: 'sent' });

    expect(mergeMessages([optimistic], [acknowledged])).toEqual([acknowledged]);
  });

  it('deduplicates replayed events and keeps chronological order', () => {
    const newer = message({ message_id: 'server-2', client_message_id: 'client-2', created_at: '2026-07-21T10:01:00.000Z' });
    const older = message({ message_id: 'server-1', created_at: '2026-07-21T10:00:00.000Z' });

    expect(mergeMessages([newer], [older, newer]).map(item => item.message_id)).toEqual(['server-1', 'server-2']);
  });
});

describe('messageFromOutbox', () => {
  it('restores a failed row without losing the original client id', () => {
    const restored = messageFromOutbox({
      accountId: 1,
      conversationId: 2,
      conversationPublicId: 'conversation-1',
      conversationType: 'group',
      clientMessageId: 'client-queued',
      payload: { type: 'text', body: 'queued text' },
      senderUserId: 10,
      createdAt: '2026-07-21T10:00:00.000Z',
    }, 'failed');

    expect(restored).toMatchObject({
      client_message_id: 'client-queued',
      conversation_type: 'group',
      body_text: 'queued text',
      status: 'failed',
    });
  });
});
