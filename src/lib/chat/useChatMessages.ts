import { useCallback, useEffect, useRef, useState } from 'react';
import { Message, chatApi } from '@/lib/api/chat';
import { useCentrifugo } from './useCentrifugo';
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const POLL_INTERVAL = 5000;

export interface ChatMessagesHook {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  send: (body: string, myId: number) => Promise<void>;
  pushMessage: (msg: Message) => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  deleteMsg: (messageId: string) => Promise<void>;
  editMsg: (messageId: string, newBody: string) => Promise<void>;
}

export function useChatMessages(
  conversationId: number,
  conversationPublicId: string,
  token: string,
): ChatMessagesHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const realtimeRef = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const data = await chatApi.getMessages(token, conversationId);
      setMessages(data);
      setHasMore(data.length >= 50);
    } catch {
      // silent
    }
  }, [token, conversationId]);

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));

    const id = setInterval(() => {
      if (!realtimeRef.current) fetchMessages();
    }, POLL_INTERVAL);

    return () => clearInterval(id);
  }, [fetchMessages]);

  const loadMore = useCallback(async () => {
    if (!token || !conversationId || messages.length === 0) return;
    const oldest = messages[0]?.message_id;
    if (!oldest) return;
    try {
      const older = await chatApi.getMessages(token, conversationId, oldest);
      if (older.length === 0) { setHasMore(false); return; }
      setMessages(prev => [...older, ...prev]);
      setHasMore(older.length >= 50);
    } catch {
      // silent
    }
  }, [token, conversationId, messages]);

  const pushMessage = useCallback((msg: Message) => {
    realtimeRef.current = true;
    setMessages(prev => {
      // deduplicate by message_id or client_message_id
      if (prev.some(m => m.message_id === msg.message_id)) return prev;
      // replace optimistic placeholder that has matching client_message_id
      const withoutOptimistic = prev.filter(m => m.client_message_id !== msg.client_message_id);
      return [...withoutOptimistic, msg];
    });
  }, []);

  const { subscribeConversation } = useCentrifugo({ authToken: token || undefined });

  useEffect(() => {
    if (!conversationPublicId) return;
    const unsubscribe = subscribeConversation(conversationPublicId, data => {
      if (data.event === 'message.created' && data.payload) {
        pushMessage(data.payload as Message);
      } else if (data.event === 'message.deleted' && data.payload) {
        const msg = data.payload as { message_id: string };
        setMessages(prev =>
          prev.map(m => m.message_id === msg.message_id ? { ...m, is_deleted: true } : m),
        );
      } else if (data.event === 'message.updated' && data.payload) {
        const updated = data.payload as Message;
        setMessages(prev => prev.map(m => m.message_id === updated.message_id ? updated : m));
      }
    });
    return unsubscribe;
  }, [conversationPublicId, subscribeConversation, pushMessage]);

  const send = useCallback(async (body: string, myId: number) => {
    if (!body.trim() || !token) return;
    setSending(true);

    const clientMessageId = uuidv4();
    const optimistic: Message = {
      message_id: `optimistic-${clientMessageId}`,
      client_message_id: clientMessageId,
      conversation_id: conversationPublicId,
      conversation_type: 'direct',
      sender_user_id: myId,
      message_type: 'text',
      body_text: body,
      caption: '',
      media_url: '',
      sticker_id: '',
      gif_id: '',
      gift_id: 0,
      sent_gift_id: 0,
      reply_to_message_id: null,
      status: 'sending',
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      await chatApi.sendMessage(token, conversationId, body, clientMessageId);
      if (!realtimeRef.current) {
        const fresh = await chatApi.getMessages(token, conversationId);
        setMessages(fresh);
      } else {
        // server push via Centrifugo will replace optimistic via pushMessage
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.client_message_id !== clientMessageId));
      throw err;
    } finally {
      setSending(false);
    }
  }, [token, conversationId, conversationPublicId]);

  const deleteMsg = useCallback(async (messageId: string) => {
    setMessages(prev => prev.map(m => m.message_id === messageId ? { ...m, is_deleted: true } : m));
    try {
      await chatApi.deleteMessage(token, conversationId, messageId);
    } catch {
      setMessages(prev => prev.map(m => m.message_id === messageId ? { ...m, is_deleted: false } : m));
    }
  }, [token, conversationId]);

  const editMsg = useCallback(async (messageId: string, newBody: string) => {
    setMessages(prev =>
      prev.map(m => m.message_id === messageId ? { ...m, body_text: newBody, is_edited: true } : m),
    );
    try {
      await chatApi.editMessage(token, conversationId, messageId, newBody);
    } catch {
      // rollback — re-fetch to get original
      fetchMessages();
    }
  }, [token, conversationId, fetchMessages]);

  return { messages, loading, sending, send, pushMessage, loadMore, hasMore, deleteMsg, editMsg };
}
