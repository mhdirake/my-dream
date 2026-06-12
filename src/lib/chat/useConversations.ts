import { useCallback, useEffect, useState } from 'react';
import { Conversation, chatApi } from '@/lib/api/chat';

const POLL_INTERVAL = 5000;

export interface ConversationsHook {
  conversations: Conversation[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
  // Socket integration point:
  // When Pusher presence channel fires a conversation update event,
  // call updateConversation() or just call refresh().
  updateConversation: (updated: Conversation) => void;
}

export function useConversations(
  token: string | undefined,
  pollingEnabled = true,
): ConversationsHook {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await chatApi.listConversations(token);
      setConversations(data);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));

    if (!pollingEnabled) return;
    const id = setInterval(fetchConversations, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchConversations, pollingEnabled]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations().finally(() => setRefreshing(false));
  }, [fetchConversations]);

  // Socket integration point: update a single conversation in-place
  const updateConversation = useCallback((updated: Conversation) => {
    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }, []);

  return { conversations, loading, refreshing, refresh, updateConversation };
}
