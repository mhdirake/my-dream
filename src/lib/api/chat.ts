import { api } from './client';

export type Message = {
  id: number;
  type: 'text' | 'image' | 'file';
  body: string | null;
  sender_id: number;
  created_at: string;
  read_at: string | null;
};

export type Conversation = {
  id: number;
  status: 'active' | 'pending' | 'locked';
  conversation_request_id?: number;
  unread_count: number;
  other_user: {
    id: number;
    first_name: string;
    profile_photo: { urls: { medium: string; thumbnail: string } } | null;
  };
  last_message: {
    body: string | null;
    type: string;
    created_at: string;
    sender_id: number;
  } | null;
};

export type ConversationRequest = {
  id: number;
  status: 'pending' | 'accepted' | 'rejected';
  template_key: string;
  sender_user: {
    id: number;
    first_name: string;
    profile_photo: { urls: { medium: string; thumbnail: string } } | null;
  };
  created_at: string;
};

export type ConversationTemplate = {
  id: number;
  title: string | null;
  body: string;
};

export const chatApi = {
  listConversations: async (token: string) => {
    const res = await api.get<{ data: Conversation[] }>('/api/client/conversations', token);
    return res.data ?? [];
  },

  getMessages: async (token: string, conversationId: number) => {
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

  respondToRequest: (token: string, requestId: number, status: 'accepted' | 'rejected') =>
    api.patch(
      `/api/client/conversation-requests/${requestId}`,
      { status },
      token,
    ),
};
