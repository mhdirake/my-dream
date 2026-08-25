import { useCallback, useEffect, useRef, useState } from 'react';
import { Message, Reaction, TypedMessagePayload, chatApi } from '@/lib/api/chat';
import { useCentrifugoCtx } from './CentrifugoContext';
import { chatRepository } from './chatRepository';
import { ChatOutboxItem } from './chatRepository.types';
import { applyReceiptWatermark, mergeMessages, messageFromOutbox } from './timeline';

// Go service publishes PascalCase until JSON tags are fixed on the backend.
// This normalizer accepts both PascalCase and snake_case so the fix is backward-compatible.
function normalizeMessage(raw: Record<string, unknown>): Message {
  const nested = (raw.message ?? raw.data ?? raw.payload) as Record<string, unknown> | undefined;
  const source = nested && typeof nested === 'object' && ('message_id' in nested || 'MessageID' in nested)
    ? nested
    : raw;
  const first = (...values: unknown[]) => values.find(value => value !== undefined && value !== null);
  const str = (...values: unknown[]) => String(first(...values, '') ?? '');
  const num = (...values: unknown[]) => Number(first(...values, 0) ?? 0);
  const bool = (...values: unknown[]) => Boolean(first(...values, false));
  const senderRaw = source.sender ?? source.Sender ?? source.sender_user ?? source.SenderUser
    ?? raw.sender ?? raw.Sender ?? raw.sender_user ?? raw.SenderUser;
  const sender = senderRaw && typeof senderRaw === 'object'
    ? senderRaw as Record<string, unknown>
    : null;
  const senderPhotoRaw = sender?.profile_photo ?? sender?.ProfilePhoto;
  let senderPhoto: NonNullable<Message['sender']>['profile_photo'] = null;
  if (typeof senderPhotoRaw === 'string' && senderPhotoRaw) {
    senderPhoto = {
      urls: {
        original: senderPhotoRaw,
        thumbnail: senderPhotoRaw,
        small: senderPhotoRaw,
        medium: senderPhotoRaw,
        large: senderPhotoRaw,
      },
    };
  } else if (senderPhotoRaw && typeof senderPhotoRaw === 'object') {
    const photo = senderPhotoRaw as Record<string, unknown>;
    const urlsRaw = photo.urls ?? photo.URLs;
    if (urlsRaw && typeof urlsRaw === 'object') {
      const urls = urlsRaw as Record<string, unknown>;
      const original = str(urls.original, urls.Original);
      const thumbnail = str(urls.thumbnail, urls.Thumbnail, urls.thumb, urls.Thumb, original);
      senderPhoto = {
        urls: {
          original: original || thumbnail,
          thumbnail,
          small: str(urls.small, urls.Small, thumbnail),
          medium: str(urls.medium, urls.Medium, original || thumbnail),
          large: str(urls.large, urls.Large, original || thumbnail),
        },
      };
    }
  }

  return {
    message_id:          str(source.message_id,          source.MessageID, source.id, source.ID),
    client_message_id:   str(source.client_message_id,   source.ClientMessageID),
    conversation_id:     str(source.conversation_id,      source.ConversationID),
    conversation_type:   str(source.conversation_type,    source.ConversationType) as 'direct' | 'group',
    sender_user_id:      num(source.sender_user_id,       source.SenderUserID, source.sender_id, source.SenderID, source.user_id, source.UserID),
    sender: sender ? {
      id:                  num(sender.id,                 sender.ID),
      username:            str(sender.username,           sender.Username),
      first_name:          str(sender.first_name,         sender.FirstName),
      last_name:           (sender.last_name ?? sender.LastName ?? null) as string | null,
      profile_photo:       senderPhoto,
    } : null,
    message_type:        str(source.message_type,         source.MessageType, source.type, source.Type, 'text') as Message['message_type'],
    body_text:           str(source.body_text,            source.BodyText, source.body, source.Body, source.text, source.Text, source.message, source.Message),
    caption:             str(source.caption,              source.Caption),
    media_url:           str(source.media_url,            source.MediaURL, source.media, source.Media),
    media_file_id:       Number(first(source.media_file_id, source.MediaFileID, 0)) || undefined,
    sticker_id:          str(source.sticker_id,           source.StickerID),
    gif_id:              str(source.gif_id,               source.GIFID),
    gift_id:             num(source.gift_id,              source.GiftID),
    sent_gift_id:        num(source.sent_gift_id,         source.SentGiftID),
    duration_seconds:    Number(first(source.duration_seconds, source.DurationSeconds, 0)) || undefined,
    reply_to_message_id: (first(source.reply_to_message_id, source.ReplyToMessageID, null)) as string | null,
    status:              str(source.status,               source.Status, 'sent'),
    is_edited:           bool(source.is_edited,           source.IsEdited),
    is_deleted:          bool(source.is_deleted,          source.IsDeleted),
    created_at:          str(source.created_at,           source.CreatedAt, new Date().toISOString()),
    reactions:           (source.reactions ?? source.Reactions ?? []) as Reaction[],
    my_reaction:         (source.my_reaction ?? source.MyReaction ?? null) as string | null,
    delivered_at:        (source.delivered_at ?? source.DeliveredAt ?? null) as string | null,
    read_at:             (source.read_at ?? source.ReadAt ?? null) as string | null,
  };
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const TYPING_CLEAR_MS = 4000;

export interface ChatMessagesHook {
  messages: Message[];
  loading: boolean;
  loadError: boolean;
  sending: boolean;
  typingUserId: number | null;
  send: (body: string) => Promise<void>;
  sendTyped: (payload: TypedMessagePayload, localUri?: string) => Promise<void>;
  retryMessage: (clientMessageId: string) => Promise<void>;
  pushMessage: (msg: Message) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
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
  accountId: number,
  conversationType: 'direct' | 'group',
): ChatMessagesHook {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSendCount, setPendingSendCount] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [typingUserId, setTypingUserId] = useState<number | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { subscribeConversation, onConnect } = useCentrifugoCtx();

  const fetchMessages = useCallback(async (replace = false) => {
    if (!token || !conversationId) return;
    try {
      const data = await chatApi.getMessages(token, conversationId);
      const chronological = data
        .map(message => normalizeMessage(message as unknown as Record<string, unknown>))
        .reverse();
      setMessages(previous => replace ? chronological : mergeMessages(previous, chronological));
      setHasMore(data.length >= 100);
      setLoadError(false);
    } catch {
      if (replace) setLoadError(true);
    }
  }, [token, conversationId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchMessages(true);
    setLoading(false);
  }, [fetchMessages]);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (accountId > 0) {
        const cached = await chatRepository.loadMessages(accountId, conversationId);
        if (!cancelled && cached.length > 0) {
          setMessages(cached.map(message =>
            message.status === 'sending' ? { ...message, status: 'failed' } : message,
          ));
        }
      }
      await fetchMessages(true);
      if (!cancelled) setLoading(false);
    };
    hydrate().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchMessages, accountId, conversationId]);

  useEffect(() => {
    if (loading || accountId <= 0) return;
    const timer = setTimeout(() => {
      chatRepository.saveMessages(accountId, conversationId, messages).catch(() => {});
    }, 150);
    return () => clearTimeout(timer);
  }, [messages, loading, accountId, conversationId]);

  useEffect(() => {
    return onConnect(() => fetchMessages(false));
  }, [onConnect, fetchMessages]);

  const loadMore = useCallback(async () => {
    if (!token || !conversationId || messages.length === 0) return;
    const oldest = messages[0]?.message_id;
    if (!oldest) return;
    try {
      const older = await chatApi.getMessages(token, conversationId, oldest);
      if (older.length === 0) { setHasMore(false); return; }
      const normalizedOlder = older
        .map(message => normalizeMessage(message as unknown as Record<string, unknown>))
        .reverse();
      setMessages(prev => mergeMessages(prev, normalizedOlder));
      setHasMore(older.length >= 100);
    } catch {
      // silent
    }
  }, [token, conversationId, messages]);

  const pushMessage = useCallback((msg: Message) => {
    setMessages(prev => {
      return mergeMessages(prev, [msg]);
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
        setMessages(prev => mergeMessages(prev, [updated]));

      } else if (data.event === 'message.reaction.updated') {
        const msgId = (raw.message_id ?? raw.MessageID) as string;
        const reaction = (raw.reaction ?? raw.Reaction) as string;
        const userId = Number(raw.user_id ?? raw.UserID);
        setMessages(prev => prev.map(m => {
          if (m.message_id !== msgId) return m;
          // echo واقعی جایگزین entry موقتِ optimistic (user_id: -1) می‌شه — وگرنه دوبار شمرده می‌شه
          const existing = (m.reactions ?? []).filter(r =>
            r.user_id !== userId && !(r.user_id === -1 && r.reaction === reaction),
          );
          const already = existing.some(r => r.reaction === reaction && r.user_id === userId);
          return {
            ...m,
            reactions: already ? existing : [...existing, { reaction, user_id: userId }],
            my_reaction: userId === accountId ? reaction : m.my_reaction,
          };
        }));

      } else if (data.event === 'message.reaction.removed') {
        const msgId = (raw.message_id ?? raw.MessageID) as string;
        const userId = Number(raw.user_id ?? raw.UserID);
        setMessages(prev => prev.map(m => {
          if (m.message_id !== msgId) return m;
          return {
            ...m,
            reactions: (m.reactions ?? []).filter(r => r.user_id !== userId && !(r.user_id === -1 && userId === accountId)),
            my_reaction: userId === accountId ? null : m.my_reaction,
          };
        }));

      } else if (data.event === 'message.read') {
        const msgId = raw.message_id as string;
        const actorUserId = Number(raw.user_id);
        if (actorUserId !== accountId) {
          setMessages(prev => applyReceiptWatermark(
            prev, accountId, msgId, raw.through_created_at as string | undefined, 'read_at', new Date().toISOString(),
          ));
        }

      } else if (data.event === 'message.delivered') {
        const msgId = raw.message_id as string;
        const actorUserId = Number(raw.user_id);
        if (actorUserId !== accountId) {
          setMessages(prev => applyReceiptWatermark(
            prev, accountId, msgId, raw.through_created_at as string | undefined, 'delivered_at', new Date().toISOString(),
          ));
        }

      } else if (data.event === 'typing') {
        const userId = Number(raw.user_id);
        setTypingUserId(userId);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUserId(null), TYPING_CLEAR_MS);
      }
    }, () => fetchMessages(false));
  }, [accountId, conversationPublicId, subscribeConversation, pushMessage, fetchMessages]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, []);

  const send = useCallback(async (body: string) => {
    if (!body.trim() || !token || accountId <= 0) return;
    setPendingSendCount(count => count + 1);

    const clientMessageId = uuidv4();
    const optimistic: Message = {
      message_id: `optimistic-${clientMessageId}`,
      client_message_id: clientMessageId,
      conversation_id: conversationPublicId,
      conversation_type: conversationType,
      sender_user_id: accountId,
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

    try {
      await chatRepository.enqueue({
        accountId,
        conversationId,
        conversationPublicId,
        conversationType,
        clientMessageId,
        payload: { type: 'text', body },
        senderUserId: accountId,
        createdAt: optimistic.created_at,
      });
    } catch (error) {
      setPendingSendCount(count => Math.max(0, count - 1));
      throw error;
    }
    setMessages(prev => [...prev, optimistic]);

    try {
      const acknowledged = await chatApi.sendMessage(token, conversationId, body, clientMessageId);
      pushMessage(normalizeMessage(acknowledged as unknown as Record<string, unknown>));
      await chatRepository.removeFromOutbox(accountId, clientMessageId);
    } catch (err) {
      setMessages(prev => prev.map(message =>
        message.client_message_id === clientMessageId
          ? { ...message, status: 'failed' }
          : message,
      ));
      throw err;
    } finally {
      setPendingSendCount(count => Math.max(0, count - 1));
    }
  }, [token, conversationId, conversationPublicId, conversationType, accountId, pushMessage]);

  const sendTyped = useCallback(async (payload: TypedMessagePayload, localUri?: string) => {
    if (!token || accountId <= 0) return;
    setPendingSendCount(count => count + 1);

    const clientMessageId = uuidv4();
    const optimistic: Message = {
      message_id: `optimistic-${clientMessageId}`,
      client_message_id: clientMessageId,
      conversation_id: conversationPublicId,
      conversation_type: conversationType,
      sender_user_id: accountId,
      message_type: payload.type,
      body_text: payload.body ?? '',
      caption: payload.caption ?? '',
      media_url: localUri ?? payload.media_url ?? '',
      media_file_id: payload.media_file_id,
      sticker_id: payload.sticker_id ?? '',
      gif_id: payload.gif_id ?? '',
      gift_id: payload.gift_id ?? 0,
      sent_gift_id: payload.sent_gift_id ?? 0,
      duration_seconds: payload.duration_seconds,
      reply_to_message_id: payload.reply_to_message_id ?? null,
      status: 'sending',
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      reactions: [],
      my_reaction: null,
    };

    const outboxItem: ChatOutboxItem = {
      accountId,
      conversationId,
      conversationPublicId,
      conversationType,
      clientMessageId,
      payload,
      localUri,
      senderUserId: accountId,
      createdAt: optimistic.created_at,
    };
    try {
      await chatRepository.enqueue(outboxItem);
    } catch (error) {
      setPendingSendCount(count => Math.max(0, count - 1));
      throw error;
    }
    setMessages(prev => [...prev, optimistic]);

    try {
      const acknowledged = await chatApi.sendTypedMessage(token, conversationId, clientMessageId, payload);
      pushMessage(normalizeMessage(acknowledged as unknown as Record<string, unknown>));
      await chatRepository.removeFromOutbox(accountId, clientMessageId);
    } catch (err) {
      setMessages(prev => prev.map(message =>
        message.client_message_id === clientMessageId
          ? { ...message, status: 'failed' }
          : message,
      ));
      throw err;
    } finally {
      setPendingSendCount(count => Math.max(0, count - 1));
    }
  }, [token, conversationId, conversationPublicId, conversationType, accountId, pushMessage]);

  const retryMessage = useCallback(async (clientMessageId: string) => {
    const failed = messages.find(message => message.client_message_id === clientMessageId && message.status === 'failed');
    if (!failed) return;

    setMessages(previous => previous.map(message =>
      message.client_message_id === clientMessageId ? { ...message, status: 'sending' } : message,
    ));
    try {
      const acknowledged = failed.message_type === 'text'
        ? await chatApi.sendMessage(token, conversationId, failed.body_text, clientMessageId, failed.reply_to_message_id ?? undefined)
        : await chatApi.sendTypedMessage(token, conversationId, clientMessageId, {
          type: failed.message_type,
          body: failed.body_text,
          caption: failed.caption,
          media_url: failed.media_url,
          media_file_id: failed.media_file_id,
          duration_seconds: failed.duration_seconds,
          sticker_id: failed.sticker_id,
          gif_id: failed.gif_id,
          gift_id: failed.gift_id,
          sent_gift_id: failed.sent_gift_id,
          reply_to_message_id: failed.reply_to_message_id ?? undefined,
        });
      pushMessage(normalizeMessage(acknowledged as unknown as Record<string, unknown>));
      await chatRepository.removeFromOutbox(accountId, clientMessageId);
    } catch (error) {
      setMessages(previous => previous.map(message =>
        message.client_message_id === clientMessageId ? { ...message, status: 'failed' } : message,
      ));
      throw error;
    }
  }, [messages, token, conversationId, accountId, pushMessage]);

  const flushOutbox = useCallback(async () => {
    if (!token || accountId <= 0) return;
    const queued = await chatRepository.listOutbox(accountId, conversationId);
    for (const item of queued) {
      setMessages(previous => {
        if (!previous.some(message => message.client_message_id === item.clientMessageId) && item.senderUserId > 0) {
          return mergeMessages(previous, [messageFromOutbox(item, 'sending')]);
        }
        return previous.map(message =>
          message.client_message_id === item.clientMessageId
            ? { ...message, status: 'sending' }
            : message,
        );
      });
      try {
        const acknowledged = item.payload.type === 'text'
          ? await chatApi.sendMessage(token, conversationId, item.payload.body ?? '', item.clientMessageId, item.payload.reply_to_message_id)
          : await chatApi.sendTypedMessage(token, conversationId, item.clientMessageId, item.payload);
        pushMessage(normalizeMessage(acknowledged as unknown as Record<string, unknown>));
        await chatRepository.removeFromOutbox(accountId, item.clientMessageId);
      } catch {
        setMessages(previous => previous.map(message =>
          message.client_message_id === item.clientMessageId
            ? { ...message, status: 'failed' }
            : message,
        ));
      }
    }
  }, [token, accountId, conversationId, pushMessage]);

  useEffect(() => {
    queueMicrotask(() => { flushOutbox().catch(() => {}); });
    return onConnect(() => { flushOutbox().catch(() => {}); });
  }, [flushOutbox, onConnect]);

  const deleteMsg = useCallback(async (messageId: string) => {
    setMessages(prev => prev.map(m => m.message_id === messageId ? { ...m, is_deleted: true } : m));
    try {
      await chatApi.deleteMessage(token, conversationId, messageId);
    } catch (error) {
      setMessages(prev => prev.map(m => m.message_id === messageId ? { ...m, is_deleted: false } : m));
      throw error;
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
      // Strip any prior reaction of mine regardless of how it's currently represented —
      // either the optimistic placeholder (user_id: -1) from this session, or the real
      // account id if it was loaded from the server (e.g. reacted in an earlier session).
      // Matching only -1 here left stale reactions on screen until the next full refetch.
      const withoutMine = (m.reactions ?? []).filter(r => r.user_id !== accountId && r.user_id !== -1);
      if (myPrev === reaction) {
        // remove
        return { ...m, reactions: withoutMine, my_reaction: null };
      }
      return { ...m, reactions: [...withoutMine, { reaction, user_id: -1 }], my_reaction: reaction };
    }));

    try {
      await chatApi.setReaction(token, conversationId, messageId, reaction);
    } catch {
      fetchMessages();
    }
  }, [token, conversationId, fetchMessages, accountId]);

  const removeReaction = useCallback(async (messageId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.message_id !== messageId) return m;
      const next = (m.reactions ?? []).filter(r => r.user_id !== accountId && r.user_id !== -1);
      return { ...m, reactions: next, my_reaction: null };
    }));
    try {
      await chatApi.removeReaction(token, conversationId, messageId);
    } catch {
      fetchMessages();
    }
  }, [token, conversationId, fetchMessages, accountId]);

  const loadContext = useCallback(async (messageId: string): Promise<string | null> => {
    try {
      const res = await chatApi.getMessageContext(token, conversationId, messageId);
      if (res.items?.length) {
        // context API returns ascending (oldest first) — no reverse needed
        const normalizedContext = res.items.map(message =>
          normalizeMessage(message as unknown as Record<string, unknown>),
        );
        setMessages(previous => mergeMessages(previous, normalizedContext));
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
    messages, loading, loadError, sending: pendingSendCount > 0, typingUserId,
    send, sendTyped, retryMessage, pushMessage, loadMore, refresh, hasMore,
    deleteMsg, editMsg,
    setReaction, removeReaction,
    loadContext, highlightId, clearHighlight,
  };
}
