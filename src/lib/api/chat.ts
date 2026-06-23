import { api } from './client';

export type ConversationUserPhoto = {
  urls: {
    original: string;
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
  };
};

export type ConversationUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string | null;
  is_restricted?: boolean;
  restriction_badge?: string | null;
  gold_badge?: { active: boolean; active_until: string | null };
  profile_photo: ConversationUserPhoto | null;
};

export type MessageType =
  | 'text'
  | 'voice'
  | 'image'
  | 'sticker'
  | 'gif'
  | 'gift'
  | 'template_first_message';

export type Message = {
  message_id: string;
  client_message_id: string;
  conversation_id: string;
  conversation_type: 'direct' | 'group';
  sender_user_id: number;
  message_type: MessageType;
  body_text: string;
  caption: string;
  media_url: string;
  sticker_id: string;
  gif_id: string;
  gift_id: number;
  sent_gift_id: number;
  reply_to_message_id: string | null;
  status: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
};

export type Conversation = {
  id: number;
  public_id: string;
  status: 'accepted' | 'pending' | 'expired' | 'rejected' | 'locked';
  type: 'direct' | 'group';
  first_user_id: number;
  second_user_id: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_type: MessageType | null;
  last_message_sender_user_id: number | null;
  pending_expires_at: string | null;
  accepted_at: string | null;
  first_user: ConversationUser;
  second_user: ConversationUser;
  unread_count?: number;
};

export type ConversationTemplate = {
  id: number;
  title: string | null;
  body: string;
};

export const chatApi = {
  listConversations: async (token: string): Promise<Conversation[]> => {
    const res = await api.get<{ data: Conversation[] }>('/api/client/conversations', token);
    return res.data ?? [];
  },

  listPendingIncoming: async (token: string): Promise<Conversation[]> => {
    const res = await api.get<{ data: Conversation[] }>(
      '/api/client/conversations/pending/incoming',
      token,
    );
    return res.data ?? [];
  },

  listPendingOutgoing: async (token: string): Promise<Conversation[]> => {
    const res = await api.get<{ data: Conversation[] }>(
      '/api/client/conversations/pending/outgoing',
      token,
    );
    return res.data ?? [];
  },

  getMessages: async (
    token: string,
    conversationId: number,
    beforeMessageId?: string,
    limit = 50,
  ): Promise<Message[]> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (beforeMessageId) params.set('before_message_id', beforeMessageId);
    const res = await api.get<{ items: Message[] }>(
      `/api/client/conversations/${conversationId}/messages?${params}`,
      token,
    );
    return res.items ?? [];
  },

  sendMessage: (
    token: string,
    conversationId: number,
    body: string,
    clientMessageId: string,
  ) =>
    api.post(
      `/api/client/conversations/${conversationId}/messages`,
      { client_message_id: clientMessageId, type: 'text', body },
      token,
    ),

  markRead: (token: string, conversationId: number, messageId: string) =>
    api.post(
      `/api/client/conversations/${conversationId}/messages/${messageId}/read`,
      {},
      token,
    ),

  markDelivered: (token: string, conversationId: number, messageId: string) =>
    api.post(
      `/api/client/conversations/${conversationId}/messages/${messageId}/delivered`,
      {},
      token,
    ),

  sendTyping: (token: string, conversationId: number) =>
    api.post(`/api/client/conversations/${conversationId}/typing`, {}, token),

  deleteMessage: (token: string, conversationId: number, messageId: string) =>
    api.delete(`/api/client/conversations/${conversationId}/messages/${messageId}`, token),

  editMessage: (token: string, conversationId: number, messageId: string, body: string) =>
    api.patch(
      `/api/client/conversations/${conversationId}/messages/${messageId}`,
      { body },
      token,
    ),

  getPresence: async (token: string, userId: number) => {
    const res = await api.get<{ data: { is_online: boolean; last_seen_at: string | null } }>(
      `/api/client/presence/users/${userId}`,
      token,
    );
    return res.data;
  },

  listConversationTemplates: async (token: string): Promise<ConversationTemplate[]> => {
    const res = await api.get<{ data: ConversationTemplate[] }>(
      '/api/client/conversation-start-templates',
      token,
    );
    return res.data ?? [];
  },

  sendConversationRequest: async (token: string, userId: number, templateId: number) => {
    const res = await api.post<{ data: { id: number } }>(
      `/api/client/users/${userId}/conversation-requests`,
      { conversation_start_template_id: templateId },
      token,
    );
    return res.data.id;
  },

  acceptConversation: (token: string, conversationId: number) =>
    api.post(`/api/client/conversations/${conversationId}/accept`, undefined, token),

  rejectConversation: (token: string, conversationId: number) =>
    api.post(`/api/client/conversations/${conversationId}/reject`, undefined, token),

  getRealtimeToken: async (token: string) => {
    const res = await api.get<{
      token: string;
      ws_url: string;
      channels: { user: string };
      expires_in: number;
    }>('/api/client/realtime/token', token);
    return res;
  },
};
