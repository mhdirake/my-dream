import { Message, TypedMessagePayload } from '@/lib/api/chat';

export type ChatOutboxItem = {
  accountId: number;
  conversationId: number;
  conversationPublicId: string;
  conversationType: 'direct' | 'group';
  clientMessageId: string;
  payload: TypedMessagePayload;
  localUri?: string;
  senderUserId: number;
  createdAt: string;
};

export interface ChatRepository {
  loadMessages(accountId: number, conversationId: number): Promise<Message[]>;
  saveMessages(accountId: number, conversationId: number, messages: Message[]): Promise<void>;
  enqueue(item: ChatOutboxItem): Promise<void>;
  removeFromOutbox(accountId: number, clientMessageId: string): Promise<void>;
  listOutbox(accountId: number, conversationId: number): Promise<ChatOutboxItem[]>;
}
