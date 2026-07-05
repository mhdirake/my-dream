import { useCallback, useEffect, useState } from 'react';
import { Message, Reaction, TypedMessagePayload, chatApi } from '@/lib/api/chat';
import { useCentrifugoCtx } from './CentrifugoContext';

// Go service publishes PascalCase until JSON tags are fixed on the backend.
// This normalizer accepts both PascalCase and snake_case so the fix is backward-compatible.
function normalizeMessage(raw: Record<string, unknown>): Message {
  const str = (a: unknown, b: unknown, fallback = '') =>
    ((a ?? b ?? fallback) as string);
  const num = (a: unknown, b: unknown) =>
    Number(a ?? b ?? 0);
  const bool = (a: unknown, b: unknown) =>
    Boolean(a ?? b ?? false);

  return {
    message_id:          str(raw.message_id,          raw.MessageID),
    client_message_id:   str(raw.client_message_id,   raw.ClientMessageID),
    conversation_id:     str(raw.conversation_id,      raw.ConversationID),
    conversation_type:   str(raw.conversation_type,    raw.ConversationType) as 'direct' | 'group',
    sender_user_id:      num(raw.sender_user_id,       raw.SenderUserID),
    message_type:        str(raw.message_type,         raw.MessageType) as Message['message_type'],
    body_text:           str(raw.body_text,            raw.BodyText),
    caption:             str(raw.caption,              raw.Caption),
    media_url:           str(raw.media_url,            raw.MediaURL),
    sticker_id:          str(raw.sticker_id,           raw.StickerID),
    gif_id:              str(raw.gif_id,               raw.GIFID),
    gift_id:             num(raw.gift_id,              raw.GiftID),
    sent_gift_id:        num(raw.sent_gift_id,         raw.SentGiftID),
    duration_seconds:    Number(raw.duration_seconds ?? raw.DurationSeconds ?? 0) || undefined,
    reply_to_message_id: (raw.reply_to_message_id ?? raw.ReplyToMessageID ?? null) as string | null,
    status:              str(raw.status,               raw.Status, 'sent'),
    is_edited:           bool(raw.is_edited,           raw.IsEdited),
    is_deleted:          bool(raw.is_deleted,          raw.IsDeleted),
    created_at:          str(raw.created_at,           raw.CreatedAt),
    reactions:           (raw.reactions ?? raw.Reactions ?? []) as Reaction[],
    my_reaction:         (raw.my_reaction ?? raw.MyReaction ?? null) as string | null,
    delivered_at:        (raw.delivered_at ?? raw.DeliveredAt ?? null) as string | null,
    read_at:             (raw.read_at ?? raw.ReadAt ?? null) as string | null,
  };
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface ChatMessagesHook {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  send: (body: string, myId: number) => Promise<void>;
  sendTyped: (payload: TypedMessagePayload, myId: number, localUri?: string) => Promise<void>;
  pushMessage: (msg: Message) => void;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  deleteMsg: (messageId: string) => Promise<void>;
  editMsg: (messageId: string, newBody: string) => Promise<void>;
  setReaction: (messageId: string, reaction: string) => Promise<void>;
  removeReaction: (messageId: string) => Promise<void>;
  loadContext: (messageId: string) => Promise<string | null>;
  highlightId: string | null;
  clearHighlight: () => void;
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
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const { isConnectedRef, subscribeConversation, onConnect } = useCentrifugoCtx();

  const fetchMessages = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const data = await chatApi.getMessages(token, conversationId);
      setMessages([...data].reverse());
      setHasMore(data.length >= 100);
    } catch {
      // silent
    }
  }, [token, conversationId]);

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
  }, [fetchMessages]);

  useEffect(() => {
    return onConnect(() => fetchMessages());
  }, [onConnect, fetchMessages]);

  const loadMore = useCallback(async () => {
    if (!token || !conversationId || messages.length === 0) return;
    const oldest = messages[0]?.message_id;
    if (!oldest) return;
    try {
      const older = await chatApi.getMessages(token, conversationId, oldest);
      if (older.length === 0) { setHasMore(false); return; }
      setMessages(prev => [...[...older].reverse(), ...prev]);
      setHasMore(older.length >= 100);
    } catch {
      // silent
    }
  }, [token, conversationId, messages]);

  const pushMessage = useCallback((msg: Message) => {
    setMessages(prev => {
      if (prev.some(m => m.message_id === msg.message_id)) return prev;
      const withoutOptimistic = prev.filter(m => m.client_message_id !== msg.client_message_id);
      return [...withoutOptimistic, msg];
    });
  }, []);

  // Centrifugo conversation channel
  useEffect(() => {
    if (!conversationPublicId) return;
    return subscribeConversation(conversationPublicId, data => {
      const raw = data.payload as Record<string, unknown> | undefined;
      if (!raw) return;

      if (data.event === 'message.created') {
        pushMessage(normalizeMessage(raw));

      } else if (data.event === 'message.deleted') {
        const id = (raw.message_id ?? raw.MessageID) as string;
        setMessages(prev =>
          prev.map(m => m.message_id === id ? { ...m, is_deleted: true } : m),
        );

      } else if (data.event === 'message.updated') {
        const updated = normalizeMessage(raw);
        setMessages(prev => prev.map(m => m.message_id === updated.message_id ? updated : m));

      } else if (data.event === 'message.reaction.updated') {
        const msgId = raw.message_id as string;
        const reaction = raw.reaction as string;
        const userId = Number(raw.user_id);
        setMessages(prev => prev.map(m => {
          if (m.message_id !== msgId) return m;
          const existing = m.reactions ?? [];
          const already = existing.some(r => r.reaction === reaction && r.user_id === userId);
          return { ...m, reactions: already ? existing : [...existing, { reaction, user_id: userId }] };
        }));

      } else if (data.event === 'message.reaction.removed') {
        const msgId = raw.message_id as string;
        const userId = Number(raw.user_id);
        setMessages(prev => prev.map(m => {
          if (m.message_id !== msgId) return m;
          return { ...m, reactions: (m.reactions ?? []).filter(r => r.user_id !== userId) };
        }));

      } else if (data.event === 'message.read') {
        const msgId = raw.message_id as string;
        setMessages(prev => prev.map(m =>
          m.message_id === msgId ? { ...m, read_at: new Date().toISOString() } : m,
        ));

      } else if (data.event === 'message.delivered') {
        const msgId = raw.message_id as string;
        setMessages(prev => prev.map(m =>
          m.message_id === msgId ? { ...m, delivered_at: new Date().toISOString() } : m,
        ));
      }
    });
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
      reactions: [],
      my_reaction: null,
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      await chatApi.sendMessage(token, conversationId, body, clientMessageId);
      if (!isConnectedRef.current) {
        const fresh = await chatApi.getMessages(token, conversationId);
        setMessages([...fresh].reverse());
      }
    } catch (err) {
      setMessages(prev => prev.filter(m => m.client_message_id !== clientMessageId));
      throw err;
    } finally {
      setSending(false);
    }
  }, [token, conversationId, conversationPublicId]);

  const sendTyped = useCallback(async (payload: TypedMessagePayload, myId: number, localUri?: string) => {
    if (!token) return;
    setSending(true);

    const clientMessageId = uuidv4();
    const optimistic: Message = {
      message_id: `optimistic-${clientMessageId}`,
      client_message_id: clientMessageId,
      conversation_id: conversationPublicId,
      conversation_type: 'direct',
      sender_user_id: myId,
      message_type: payload.type,
      body_text: payload.body ?? '',
      caption: payload.caption ?? '',
      media_url: localUri ?? payload.media_url ?? '',
      sticker_id: payload.sticker_id ?? '',
      gif_id: payload.gif_id ?? '',
      gift_id: payload.gift_id ?? 0,
      sent_gift_id: payload.sent_gift_id ?? 0,
      duration_seconds: payload.duration_seconds,
      reply_to_message_id: null,
      status: 'sending',
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      reactions: [],
      my_reaction: null,
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      await chatApi.sendTypedMessage(token, conversationId, clientMessageId, payload);
      if (!isConnectedRef.current) {
        const fresh = await chatApi.getMessages(token, conversationId);
        setMessages([...fresh].reverse());
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
      fetchMessages();
    }
  }, [token, conversationId, fetchMessages]);

  const setReaction = useCallback(async (messageId: string, reaction: string) => {
    // optimistic: toggle
    setMessages(prev => prev.map(m => {
      if (m.message_id !== messageId) return m;
      const myPrev = m.my_reaction;
      const existing = m.reactions ?? [];
      let next: Reaction[];
      if (myPrev === reaction) {
        // remove
        next = existing.filter(r => r.reaction !== reaction || r.user_id !== -1);
        return { ...m, reactions: next, my_reaction: null };
      }
      if (myPrev) {
        next = existing.filter(r => r.reaction !== myPrev);
      } else {
        next = existing;
      }
      return { ...m, reactions: [...next, { reaction, user_id: -1 }], my_reaction: reaction };
    }));

    try {
      await chatApi.setReaction(token, conversationId, messageId, reaction);
    } catch {
      fetchMessages();
    }
  }, [token, conversationId, fetchMessages]);

  const removeReaction = useCallback(async (messageId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.message_id !== messageId) return m;
      const myPrev = m.my_reaction;
      const next = (m.reactions ?? []).filter(r => r.reaction !== myPrev);
      return { ...m, reactions: next, my_reaction: null };
    }));
    try {
      await chatApi.removeReaction(token, conversationId, messageId);
    } catch {
      fetchMessages();
    }
  }, [token, conversationId, fetchMessages]);

  const loadContext = useCallback(async (messageId: string): Promise<string | null> => {
    try {
      const res = await chatApi.getMessageContext(token, conversationId, messageId);
      if (res.items?.length) {
        // context API returns ascending (oldest first) — no reverse needed
        setMessages([...res.items]);
        setHasMore(true);
        setHighlightId(messageId);
        return messageId;
      }
    } catch {
      // silent
    }
    return null;
  }, [token, conversationId]);

  const clearHighlight = useCallback(() => setHighlightId(null), []);

  return {
    messages, loading, sending,
    send, sendTyped, pushMessage, loadMore, hasMore,
    deleteMsg, editMsg,
    setReaction, removeReaction,
    loadContext, highlightId, clearHighlight,
  };
}
