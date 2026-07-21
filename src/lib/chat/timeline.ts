import type { Message } from '@/lib/api/chat';
import type { ChatOutboxItem } from './chatRepository.types';

export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byMessageId = new Map<string, Message>();
  const optimisticByClientId = new Map(
    current
      .filter(message => message.message_id.startsWith('optimistic-'))
      .map(message => [message.client_message_id, message]),
  );

  for (const message of current) byMessageId.set(message.message_id, message);
  for (const message of incoming) {
    const optimistic = optimisticByClientId.get(message.client_message_id);
    if (optimistic) byMessageId.delete(optimistic.message_id);
    byMessageId.set(message.message_id, message);
  }

  return [...byMessageId.values()].sort((left, right) => {
    const timeDiff = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    return timeDiff || left.message_id.localeCompare(right.message_id);
  });
}

export function applyReceiptWatermark(
  messages: Message[],
  accountId: number,
  messageId: string,
  throughCreatedAt: string | undefined,
  field: 'read_at' | 'delivered_at',
  recordedAt: string,
): Message[] {
  const target = messages.find(message => message.message_id === messageId);
  const cutoff = throughCreatedAt || target?.created_at;

  return messages.map(message =>
    message.sender_user_id === accountId && (cutoff ? message.created_at <= cutoff : message.message_id === messageId)
      ? { ...message, [field]: recordedAt }
      : message,
  );
}

export function messageFromOutbox(item: ChatOutboxItem, status: 'sending' | 'failed'): Message {
  return {
    message_id: `optimistic-${item.clientMessageId}`,
    client_message_id: item.clientMessageId,
    conversation_id: item.conversationPublicId,
    conversation_type: item.conversationType,
    sender_user_id: item.senderUserId,
    message_type: item.payload.type,
    body_text: item.payload.body ?? '',
    caption: item.payload.caption ?? '',
    media_url: item.localUri ?? item.payload.media_url ?? '',
    media_file_id: item.payload.media_file_id,
    sticker_id: item.payload.sticker_id ?? '',
    gif_id: item.payload.gif_id ?? '',
    gift_id: item.payload.gift_id ?? 0,
    sent_gift_id: item.payload.sent_gift_id ?? 0,
    duration_seconds: item.payload.duration_seconds,
    reply_to_message_id: item.payload.reply_to_message_id ?? null,
    status,
    is_edited: false,
    is_deleted: false,
    created_at: item.createdAt,
    reactions: [],
    my_reaction: null,
  };
}
