import { ChatOutboxItem, ChatRepository } from './chatRepository.types';
import { Message } from '@/lib/api/chat';

const messages = new Map<string, Message[]>();
const outbox = new Map<string, ChatOutboxItem>();

const messageKey = (accountId: number, conversationId: number) => `${accountId}:${conversationId}`;
const outboxKey = (accountId: number, clientMessageId: string) => `${accountId}:${clientMessageId}`;

export const chatRepository: ChatRepository = {
  async loadMessages(accountId, conversationId) {
    return messages.get(messageKey(accountId, conversationId)) ?? [];
  },
  async saveMessages(accountId, conversationId, items) {
    messages.set(messageKey(accountId, conversationId), items.slice(-500));
  },
  async enqueue(item) {
    outbox.set(outboxKey(item.accountId, item.clientMessageId), item);
  },
  async removeFromOutbox(accountId, clientMessageId) {
    outbox.delete(outboxKey(accountId, clientMessageId));
  },
  async listOutbox(accountId, conversationId) {
    return [...outbox.values()].filter(item =>
      item.accountId === accountId && item.conversationId === conversationId,
    );
  },
};
