import { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation, chatApi } from '@/lib/api/chat';
import { useCentrifugo } from './useCentrifugo';

const POLL_INTERVAL = 10000;

export interface ConversationsHook {
  conversations: Conversation[];
  pendingIncoming: Conversation[];
  pendingOutgoing: Conversation[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
  resetUnread: (publicId: string) => void;
}

export function useConversations(token: string | undefined): ConversationsHook {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<Conversation[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const realtimeRef = useRef(false);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const [accepted, incoming, outgoing] = await Promise.all([
        chatApi.listConversations(token),
        chatApi.listPendingIncoming(token),
        chatApi.listPendingOutgoing(token),
      ]);
      setConversations(accepted);
      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));

    const id = setInterval(() => {
      if (!realtimeRef.current) fetchConversations();
    }, POLL_INTERVAL);

    return () => clearInterval(id);
  }, [fetchConversations]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations().finally(() => setRefreshing(false));
  }, [fetchConversations]);

  // Called when user opens a specific conversation to clear its local unread badge
  const resetUnread = useCallback((publicId: string) => {
    setConversations(prev =>
      prev.map(c => c.public_id === publicId ? { ...c, unread_count: 0 } : c),
    );
  }, []);

  const onUserEvent = useCallback((data: { event: string; [k: string]: unknown }) => {
    if (
      data.event === 'conversation_request.created' ||
      data.event === 'conversation.accepted'
    ) {
      realtimeRef.current = true;
      fetchConversations();
      return;
    }

    // New message for this user on a conversation not currently open
    if (data.event === 'conversation.unread.updated') {
      realtimeRef.current = true;
      const p = data.payload as { conversation_id?: string } | undefined;
      const convPublicId = p?.conversation_id;
      if (convPublicId) {
        setConversations(prev =>
          prev.map(c =>
            c.public_id === convPublicId
              ? { ...c, unread_count: (c.unread_count ?? 0) + 1 }
              : c,
          ),
        );
        // Also refresh to get latest last_message_preview
        fetchConversations();
      }
    }
  }, [fetchConversations]);

  useCentrifugo({ authToken: token, onUserEvent });

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
