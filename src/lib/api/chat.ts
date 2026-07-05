import { File as FSFile, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';
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

export type Reaction = { reaction: string; user_id: number };

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
  reactions?: Reaction[];
  my_reaction?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
};

export type MessageSearchItem = {
  message_id: string;
  conversation_id: string;
  sender_user_id: number;
  message_type: MessageType;
  text_snippet: string;
  created_at: string;
};

export type MessageSearchResult = {
  items: MessageSearchItem[];
  next_cursor: string | null;
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

export type MediaUploadResult = {
  media_url: string;
  media_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
};

export type TypedMessagePayload = {
  type: MessageType;
  body?: string;
  caption?: string;
  media_url?: string;
  media_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  sticker_id?: string;
  gif_id?: string;
  gift_id?: number;
  sent_gift_id?: number;
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
    limit = 100,
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

  sendTypedMessage: (
    token: string,
    conversationId: number,
    clientMessageId: string,
    payload: TypedMessagePayload,
  ) =>
    api.post(
      `/api/client/conversations/${conversationId}/messages`,
      { client_message_id: clientMessageId, ...payload },
      token,
    ),

  uploadConversationImage: async (
    token: string,
    conversationId: number,
    uri: string,
    mimeType = 'image/jpeg',
    caption?: string,
  ): Promise<MediaUploadResult> => {
    const url = `${process.env.EXPO_PUBLIC_API_URL}/api/client/conversations/${conversationId}/images`;

    if (Platform.OS !== 'web') {
      const file = new FSFile(uri);
      const result = await file.upload(url, {
        uploadType: UploadType.MULTIPART,
        fieldName: 'image',
        mimeType,
        headers: { Authorization: `Bearer ${token}` },
        ...(caption ? { parameters: { caption } } : {}),
      });
      const data = JSON.parse(result.body || '{}');
      if (result.status < 200 || result.status >= 300)
        throw new Error(data?.message ?? `HTTP ${result.status}`);
      return data.data as MediaUploadResult;
    }

    const blob = await fetch(uri).then(r => r.blob());
    const file = new File([blob], 'photo.jpg', { type: blob.type || mimeType });
    const form = new FormData();
    form.append('image', file);
    if (caption) form.append('caption', caption);
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return data.data as MediaUploadResult;
  },

  uploadConversationVoice: async (
    token: string,
    conversationId: number,
    uri: string,
    durationSeconds: number,
    mimeType = 'audio/m4a',
  ): Promise<MediaUploadResult> => {
    const url = `${process.env.EXPO_PUBLIC_API_URL}/api/client/conversations/${conversationId}/files`;
    const parameters = { type: 'voice', duration_seconds: String(durationSeconds) };

    if (Platform.OS !== 'web') {
      const file = new FSFile(uri);
      const result = await file.upload(url, {
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType,
        headers: { Authorization: `Bearer ${token}` },
        parameters,
      });
      const data = JSON.parse(result.body || '{}');
      if (result.status < 200 || result.status >= 300)
        throw new Error(data?.message ?? `HTTP ${result.status}`);
      return data.data as MediaUploadResult;
    }

    const blob = await fetch(uri).then(r => r.blob());
    const file = new File([blob], 'voice.m4a', { type: blob.type || mimeType });
    const form = new FormData();
    form.append('file', file);
    form.append('type', 'voice');
    form.append('duration_seconds', String(durationSeconds));
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message ?? `HTTP ${res.status}`);
    return data.data as MediaUploadResult;
  },

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

  setReaction: (token: string, conversationId: number, messageId: string, reaction: string) =>
    api.put(
      `/api/client/conversations/${conversationId}/messages/${messageId}/reaction`,
      { reaction },
      token,
    ),

  removeReaction: (token: string, conversationId: number, messageId: string) =>
    api.delete(`/api/client/conversations/${conversationId}/messages/${messageId}/reaction`, token),

  searchMessages: async (
    token: string,
    conversationId: number,
    query: string,
    cursor?: string,
    limit = 20,
  ): Promise<MessageSearchResult> => {
    const params = new URLSearchParams({ query, limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const res = await api.get<MessageSearchResult>(
      `/api/client/conversations/${conversationId}/messages/search?${params}`,
      token,
    );
    return res;
  },

  getMessageContext: async (token: string, conversationId: number, messageId: string): Promise<{ items: Message[] }> => {
    const res = await api.get<{ items: Message[] }>(
      `/api/client/conversations/${conversationId}/messages/${messageId}/context`,
      token,
    );
    return res;
  },

  heartbeat: (token: string) =>
    api.post('/api/client/presence/heartbeat', {}, token),

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
      channels: { user: string; conversations: string[] };
      expires_in: number;
    }>('/api/client/realtime/token', token);
    return res;
  },
};
