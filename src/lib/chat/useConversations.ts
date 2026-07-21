import { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation, chatApi } from '@/lib/api/chat';
import { useCentrifugoCtx } from './CentrifugoContext';
import { useUnreadCtx } from './UnreadContext';

const sortByLastMessage = (list: Conversation[]) =>
  [...list].sort(
    (a, b) =>
      new Date(b.last_message_at ?? 0).getTime() -
      new Date(a.last_message_at ?? 0).getTime(),
  );

export interface ConversationsHook {
  conversations: Conversation[];
  pendingIncoming: Conversation[];
  pendingOutgoing: Conversation[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  refresh: () => void;
  loadMore: () => void;
  resetUnread: (publicId: string) => void;
}

export function useConversations(
  token: string | undefined,
  onNewMessage?: (conv: Conversation) => void,
): ConversationsHook {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<Conversation[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const { addUserEventHandler, onConnect } = useCentrifugoCtx();
  const { setTotalUnread } = useUnreadCtx();

  const conversationsRef = useRef<Conversation[]>([]);
  const onNewMessageRef = useRef(onNewMessage);
  const fetchCounterRef = useRef(0);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  // Sync totalUnread whenever conversations change — avoids setState-in-updater
  useEffect(() => {
    setTotalUnread(conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0));
  }, [conversations, setTotalUnread]);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    const myCount = ++fetchCounterRef.current;
    try {
      const [acceptedPage, incoming, outgoing] = await Promise.all([
        chatApi.listConversations(token),
        chatApi.listPendingIncoming(token),
        chatApi.listPendingOutgoing(token),
      ]);
      if (myCount !== fetchCounterRef.current) return;
      const sorted = sortByLastMessage(acceptedPage.data);
      setConversations(sorted);
      setNextCursor(acceptedPage.next_cursor);
      conversationsRef.current = sorted;
      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } catch {
      // silent
    }
  }, [token]);

  // Initial load on mount
  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      await fetchConversations();
      if (active) setLoading(false);
    };
    void loadInitial();
    return () => {
      active = false;
    };
  }, [fetchConversations]);

  // Catch up when WebSocket connects/reconnects (no polling needed while connected)
  useEffect(() => {
    return onConnect(() => fetchConversations());
  }, [onConnect, fetchConversations]);

  // Centrifugo user-level events — targeted updates, no blanket polling
  useEffect(() => {
    return addUserEventHandler(data => {
      if (
        data.event === 'conversation_request.created' ||
        data.event === 'conversation.accepted'
      ) {
        fetchConversations();
        return;
      }

      if (data.event === 'conversation.unread.updated' || data.event === 'conversation.updated') {
        const p = data.payload as {
          conversation_id?: string;
          unread_count?: number;
          last_message_id?: string;
          last_message_at?: string;
          last_message_sender_user_id?: number;
          last_message_type?: Conversation['last_message_type'];
          last_message_preview?: string;
          is_sender?: boolean;
        } | undefined;
        if (!p?.conversation_id) return;
        const convPublicId = p.conversation_id;

        // Patch only the affected row. Versioned server events contain an
        // absolute unread count, so duplicates and reconnects cannot inflate it.
        setConversations(prev => {
          const updated = prev.map(c =>
            c.public_id === convPublicId
              ? {
                  ...c,
                  unread_count: p.unread_count ?? (c.unread_count ?? 0) + 1,
                  last_message_at: p.last_message_at ?? c.last_message_at,
                  last_message_sender_user_id: p.last_message_sender_user_id ?? c.last_message_sender_user_id,
                  last_message_type: p.last_message_type ?? c.last_message_type,
                  last_message_preview: p.last_message_preview ?? c.last_message_preview,
                }
              : c,
          );
          return sortByLastMessage(updated);
        });

        if (!p.is_sender) {
          queueMicrotask(() => {
            const conv = conversationsRef.current.find(c => c.public_id === convPublicId);
            if (conv) onNewMessageRef.current?.(conv);
          });
        }
      }
    });
  }, [addUserEventHandler, fetchConversations]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations().finally(() => setRefreshing(false));
  }, [fetchConversations]);

  const loadMore = useCallback(() => {
    if (!token || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    chatApi.listConversations(token, nextCursor)
      .then(page => {
        setConversations(previous => sortByLastMessage([
          ...previous,
          ...page.data.filter(item => !previous.some(existing => existing.id === item.id)),
        ]));
        setNextCursor(page.next_cursor);
      })
      .finally(() => setLoadingMore(false));
  }, [loadingMore, nextCursor, token]);

  const resetUnread = useCallback((publicId: string) => {
    setConversations(prev =>
      prev.map(c => c.public_id === publicId ? { ...c, unread_count: 0 } : c),
    );
  }, []);

  return {
    conversations,
    pendingIncoming,
    pendingOutgoing,
    loading,
    refreshing,
    loadingMore,
    hasMore: nextCursor !== null,
    refresh,
    loadMore,
    resetUnread,
  };
}
