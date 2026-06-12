import { useCallback, useEffect, useRef, useState } from 'react';
import { Message, chatApi } from '@/lib/api/chat';

const POLL_INTERVAL = 3000;

export interface ChatMessagesHook {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  send: (body: string, myId: number) => Promise<void>;
  // Socket integration point:
  // When Pusher is ready, call pushMessage() from the channel event handler
  // and set pollingEnabled = false to stop polling.
  pushMessage: (msg: Message) => void;
}

export function useChatMessages(
  conversationId: number,
  token: string,
  pollingEnabled = true,
): ChatMessagesHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const latestMessages = useRef<Message[]>([]);

  latestMessages.current = messages;

  const fetchMessages = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const data = await chatApi.getMessages(token, conversationId);
      setMessages(data);
    } catch {
      // silent — keep stale data
    }
  }, [token, conversationId]);

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));

    if (!pollingEnabled) return;
    const id = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchMessages, pollingEnabled]);

  // Socket integration point: call this from Pusher channel handler
  const pushMessage = useCallback((msg: Message) => {
    setMessages(prev => {
      const exists = prev.some(m => m.id === msg.id);
      if (exists) return prev;
      return [...prev, msg];
    });
  }, []);

  const send = useCallback(async (body: string, myId: number) => {
    if (!body.trim() || !token) return;
    setSending(true);

    const tempId = Date.now();
    const optimistic: Message = {
      id: tempId,
      type: 'text',
      body,
      sender_id: myId,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      await chatApi.sendMessage(token, conversationId, body);
      // Refetch to replace optimistic with real message (real ID + server timestamp)
      const fresh = await chatApi.getMessages(token, conversationId);
      setMessages(fresh);
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw err;
    } finally {
      setSending(false);
    }
  }, [token, conversationId]);

  return { messages, loading, sending, send, pushMessage };
}
