import { api } from './client';

export type ConversationUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string | null;
  profile_photo_path: string | null;
};

export type Message = {
  id: number;
  type: 'text' | 'image' | 'file';
  body: string | null;
  sender_user_id: number;
  created_at: string;
  read_at: string | null;
};

export type Conversation = {
  id: number;
  status: 'accepted' | 'pending' | 'expired' | 'rejected';
  conversation_request_id: number | null;
  first_user_id: number;
  second_user_id: number;
  last_message_at: string | null;
  pending_expires_at: string | null;
  accepted_at: string | null;
  first_user: ConversationUser;
  second_user: ConversationUser;
  messages: Message[];
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

  getMessages: async (token: string, conversationId: number): Promise<Message[]> => {
    const res = await api.get<{ data: Message[] }>(
      `/api/client/conversations/${conversationId}/messages`,
      token,
    );
    return res.data ?? [];
  },

  sendMessage: (token: string, conversationId: number, body: string) =>
    api.post(`/api/client/conversations/${conversationId}/messages`, { type: 'text', body }, token),

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
