import { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation, chatApi } from '@/lib/api/chat';
import { useCentrifugo } from './useCentrifugo';

const POLL_INTERVAL = 8000;

export interface ConversationsHook {
  conversations: Conversation[];
  pendingIncoming: Conversation[];
  pendingOutgoing: Conversation[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
  updateConversation: (updated: Conversation) => void;
}

export function useConversations(
  token: string | undefined,
): ConversationsHook {
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

  const updateConversation = useCallback((updated: Conversation) => {
    realtimeRef.current = true;
    if (updated.status === 'accepted') {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === updated.id);
        if (idx === -1) return [updated, ...prev];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      // Remove from pending if it was there
      setPendingIncoming(prev => prev.filter(c => c.id !== updated.id));
      setPendingOutgoing(prev => prev.filter(c => c.id !== updated.id));
    } else if (updated.status === 'pending') {
      setPendingIncoming(prev => {
        if (prev.some(c => c.id === updated.id)) return prev;
        return [updated, ...prev];
      });
    }
  }, []);

  // Subscribe to user channel for conversation-level events
  const { subscribeConversation: _ } = useCentrifugo({
    authToken: token,
    onUserEvent: useCallback((data) => {
      if (
        data.event === 'conversation_request.created' ||
        data.event === 'conversation.accepted'
      ) {
        realtimeRef.current = true;
        fetchConversations();
      }
    }, [fetchConversations]),
  });

  return {
    conversations,
    pendingIncoming,
    pendingOutgoing,
    loading,
    refreshing,
    refresh,
    updateConversation,
  };
}
