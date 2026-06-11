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

export const TEMPLATE_MESSAGES: { key: string; text: string }[] = [
  { key: 'intro', text: 'سلام، دوست دارم بیشتر باهات آشنا بشم.' },
  { key: 'profile', text: 'پروفایلت برام جالب بود، خوشحال می‌شم صحبت کنیم.' },
  { key: 'common', text: 'فکر می‌کنم چند تا علاقه مشترک داریم.' },
  { key: 'chat', text: 'اگه مایل باشی، یه گفت‌وگوی کوتاه داشته باشیم.' },
];

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

  sendConversationRequest: async (token: string, userId: number, templateKey: string) => {
    const res = await api.post<{ data: { id: number } }>(
      `/api/client/users/${userId}/conversation-requests`,
      { template_key: templateKey },
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
