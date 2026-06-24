import { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation, chatApi } from '@/lib/api/chat';
import { useCentrifugoCtx } from './CentrifugoContext';

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

  const conversationsRef = useRef<Conversation[]>([]);
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const [accepted, incoming, outgoing] = await Promise.all([
        chatApi.listConversations(token),
        chatApi.listPendingIncoming(token),
        chatApi.listPendingOutgoing(token),
      ]);
      setConversations(accepted);
      conversationsRef.current = accepted;
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

        // Optimistically increment badge immediately
        setConversations(prev =>
          prev.map(c =>
            c.public_id === convPublicId
              ? { ...c, unread_count: (c.unread_count ?? 0) + 1 }
              : c,
          ),
        );

        // Refresh to get updated last_message_preview, then fire OS notification
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
