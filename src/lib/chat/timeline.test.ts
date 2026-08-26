import { describe, expect, it } from 'vitest';
import type { Message } from '@/lib/api/chat';
import { applyReceiptWatermark, mergeMessages, messageFromOutbox } from './timeline';

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

  it('keeps the optimistic sender when media acknowledgements omit sender data', () => {
    const optimistic = message({
      message_id: 'optimistic-client-voice',
      client_message_id: 'client-voice',
      sender_user_id: 7,
      message_type: 'voice',
      media_url: 'file:///voice.m4a',
      status: 'sending',
    });
    const acknowledged = message({
      message_id: 'server-voice',
      client_message_id: 'client-voice',
      sender_user_id: 0,
      message_type: 'voice',
      media_url: 'https://cdn.example/voice.m4a',
      status: 'sent',
    });

    expect(mergeMessages([optimistic], [acknowledged])[0]).toMatchObject({
      message_id: 'server-voice',
      sender_user_id: 7,
      media_url: 'https://cdn.example/voice.m4a',
    });
  });

  it('does not let partial updates overwrite a known sender', () => {
    const existing = message({ message_id: 'server-1', sender_user_id: 11, body_text: 'old' });
    const updated = message({ message_id: 'server-1', sender_user_id: 0, body_text: 'new', is_edited: true });

    expect(mergeMessages([existing], [updated])[0]).toMatchObject({
      sender_user_id: 11,
      body_text: 'new',
      is_edited: true,
    });
  });

  it('does not let a thin REST ack wipe a sticker already confirmed by the realtime echo', () => {
    // Reproduces a race: the Centrifugo message.created echo (full content) arrives and
    // replaces the optimistic entry first; the slower REST response from sending the
    // message resolves afterwards and is deliberately thin (Go's CreateMessage handler
    // only returns message_id/status/etc, not sticker_id/gif_id/gift_id). That second,
    // by-message_id merge must not overwrite the already-correct sticker_id with ''.
    const existing = message({ message_id: 'server-1', message_type: 'sticker', body_text: '', sticker_id: '😍' });
    const thinAck = message({ message_id: 'server-1', message_type: 'sticker', body_text: '', sticker_id: '' });

    expect(mergeMessages([existing], [thinAck])[0]).toMatchObject({
      sticker_id: '😍',
    });
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

  it('preserves reply and uploaded asset ids across an outbox restart', () => {
    const restored = messageFromOutbox({
      accountId: 1,
      conversationId: 2,
      conversationPublicId: 'conversation-1',
      conversationType: 'direct',
      clientMessageId: 'client-image',
      payload: {
        type: 'image',
        media_file_id: 44,
        media_url: 'https://cdn.example/image.jpg',
        reply_to_message_id: 'message-parent',
      },
      senderUserId: 10,
      createdAt: '2026-07-21T10:00:00.000Z',
    }, 'sending');

    expect(restored).toMatchObject({
      media_file_id: 44,
      reply_to_message_id: 'message-parent',
    });
  });
});

describe('applyReceiptWatermark', () => {
  it('updates only the current users messages through the server watermark', () => {
    const messages = [
      message({ message_id: 'mine-old', sender_user_id: 1, created_at: '2026-07-21T10:00:00.000Z' }),
      message({ message_id: 'theirs', sender_user_id: 2, created_at: '2026-07-21T10:01:00.000Z' }),
      message({ message_id: 'mine-new', sender_user_id: 1, created_at: '2026-07-21T10:02:00.000Z' }),
    ];

    const updated = applyReceiptWatermark(
      messages,
      1,
      'theirs',
      '2026-07-21T10:01:00.000Z',
      'read_at',
      '2026-07-21T10:03:00.000Z',
    );

    expect(updated[0].read_at).toBe('2026-07-21T10:03:00.000Z');
    expect(updated[1].read_at).toBeUndefined();
    expect(updated[2].read_at).toBeUndefined();
  });
});
