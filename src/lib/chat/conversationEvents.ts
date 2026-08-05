import type { CentrifugoEvent } from './CentrifugoContext';

export type ConversationStatus = 'accepted' | 'pending' | 'expired' | 'rejected' | 'locked';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function conversationStatusFromEvent(
  event: CentrifugoEvent,
  conversationId: number,
  conversationPublicId?: string,
): ConversationStatus | null {
  const statusFromName: Partial<Record<string, ConversationStatus>> = {
    'conversation.accepted': 'accepted',
    'conversation.rejected': 'rejected',
    'conversation.expired': 'expired',
    'conversation.locked': 'locked',
  };
  const payload = asRecord(event.payload);
  const conversation = asRecord(event.conversation)
    ?? asRecord(payload?.conversation)
    ?? payload;
  if (!conversation) return null;

  const eventId = Number(conversation.id ?? conversation.conversation_id);
  const eventPublicId = String(
    conversation.public_id ?? conversation.conversation_public_id ?? '',
  );
  const matchesId = Number.isFinite(eventId) && eventId === conversationId;
  const matchesPublicId = !!conversationPublicId && eventPublicId === conversationPublicId;
  if (!matchesId && !matchesPublicId) return null;

  const status = String(conversation.status ?? statusFromName[event.event] ?? '');
  return ['accepted', 'pending', 'expired', 'rejected', 'locked'].includes(status)
    ? status as ConversationStatus
    : null;
}
