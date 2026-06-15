import { useCallback, useEffect, useRef, useState } from 'react';
import { Message, chatApi } from '@/lib/api/chat';
import { useCentrifugo } from './useCentrifugo';

const POLL_INTERVAL = 5000;

export interface ChatMessagesHook {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  send: (body: string, myId: number) => Promise<void>;
  pushMessage: (msg: Message) => void;
}

export function useChatMessages(
  conversationId: number,
  token: string,
): ChatMessagesHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const realtimeRef = useRef(false); // true = WebSocket active, stop polling

  const fetchMessages = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const data = await chatApi.getMessages(token, conversationId);
      setMessages(data);
    } catch {
      // silent — keep stale data
    }
  }, [token, conversationId]);

  // Initial load + polling fallback (stops when realtime kicks in)
  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));

    const id = setInterval(() => {
      if (!realtimeRef.current) fetchMessages();
    }, POLL_INTERVAL);

    return () => clearInterval(id);
  }, [fetchMessages]);

  const pushMessage = useCallback((msg: Message) => {
    realtimeRef.current = true; // realtime is working, disable polling
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  // Centrifugo subscription for this conversation
  const { subscribeConversation } = useCentrifugo({
    authToken: token || undefined,
  });

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = subscribeConversation(conversationId, data => {
      if (data.event === 'message.created' && data.message) {
        pushMessage(data.message as Message);
      }
    });
    return unsubscribe;
  }, [conversationId, subscribeConversation, pushMessage]);

  const send = useCallback(async (body: string, myId: number) => {
    if (!body.trim() || !token) return;
    setSending(true);

    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      type: 'text',
      body,
      sender_user_id: myId,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      await chatApi.sendMessage(token, conversationId, body);
      // If realtime is active, the server will push the real message.
      // If not, refetch to replace optimistic with server message.
      if (!realtimeRef.current) {
        const fresh = await chatApi.getMessages(token, conversationId);
        setMessages(fresh);
      } else {
        // Remove optimistic — server push will arrive
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw err;
    } finally {
      setSending(false);
    }
  }, [token, conversationId]);

  return { messages, loading, sending, send, pushMessage };
}
