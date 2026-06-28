import { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation, chatApi } from '@/lib/api/chat';
import { useCentrifugoCtx } from './CentrifugoContext';
import { useUnreadCtx } from './UnreadContext';

export interface ConversationsHook {
  conversations: Conversation[];
  pendingIncoming: Conversation[];
  pendingOutgoing: Conversation[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
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

  const { addUserEventHandler, onConnect } = useCentrifugoCtx();
  const { setTotalUnread } = useUnreadCtx();

  const conversationsRef = useRef<Conversation[]>([]);
  const onNewMessageRef = useRef(onNewMessage);
  const fetchCounterRef = useRef(0);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);

  // Sync totalUnread whenever conversations change — avoids setState-in-updater
  useEffect(() => {
    setTotalUnread(conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0));
  }, [conversations, setTotalUnread]);

  const sortByLastMessage = (list: Conversation[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.last_message_at ?? 0).getTime() -
        new Date(a.last_message_at ?? 0).getTime(),
    );

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    const myCount = ++fetchCounterRef.current;
    try {
      const [accepted, incoming, outgoing] = await Promise.all([
        chatApi.listConversations(token),
        chatApi.listPendingIncoming(token),
        chatApi.listPendingOutgoing(token),
      ]);
      if (myCount !== fetchCounterRef.current) return;
      const sorted = sortByLastMessage(accepted);
      setConversations(sorted);
      conversationsRef.current = sorted;
      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } catch {
      // silent
    }
  }, [token]);

  // Initial load on mount
  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
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

      if (data.event === 'conversation.unread.updated') {
        const p = data.payload as { conversation_id?: string } | undefined;
        const convPublicId = p?.conversation_id;
        if (!convPublicId) return;

        // Optimistically bump unread + move conversation to top
        setConversations(prev => {
          const updated = prev.map(c =>
            c.public_id === convPublicId
              ? { ...c, unread_count: (c.unread_count ?? 0) + 1, last_message_at: new Date().toISOString() }
              : c,
          );
          return sortByLastMessage(updated);
        });

        // Refresh to get updated last_message_preview, then fire in-app notification
        fetchConversations().then(() => {
          const conv = conversationsRef.current.find(c => c.public_id === convPublicId);
          if (conv) onNewMessageRef.current?.(conv);
        });
      }
    });
  }, [addUserEventHandler, fetchConversations]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations().finally(() => setRefreshing(false));
  }, [fetchConversations]);

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
    refresh,
    resetUnread,
  };
}
