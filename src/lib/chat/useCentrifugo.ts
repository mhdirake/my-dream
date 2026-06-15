import { Centrifuge, Subscription } from 'centrifuge';
import { useCallback, useEffect, useRef } from 'react';
import { chatApi } from '@/lib/api/chat';

export type CentrifugoEvent = {
  event: string;
  [key: string]: unknown;
};

type ChannelHandler = (data: CentrifugoEvent) => void;

interface UseCentrifugoOptions {
  authToken: string | undefined;
  onUserEvent?: ChannelHandler;   // events on user:{id} channel
}

export function useCentrifugo({ authToken, onUserEvent }: UseCentrifugoOptions) {
  const clientRef = useRef<Centrifuge | null>(null);
  const userSubRef = useRef<Subscription | null>(null);
  const convSubsRef = useRef<Map<number, Subscription>>(new Map());

  const connect = useCallback(async () => {
    if (!authToken || clientRef.current) return;

    try {
      const { token, ws_url, channels } = await chatApi.getRealtimeToken(authToken);

      const client = new Centrifuge(ws_url, { token });
      clientRef.current = client;

      // Subscribe to user channel for global events (new conversation requests, etc.)
      const userSub = client.newSubscription(channels.user);
      userSubRef.current = userSub;

      userSub.on('publication', ({ data }) => {
        onUserEvent?.(data as CentrifugoEvent);
      });

      userSub.subscribe();
      client.connect();
    } catch {
      // silent — polling fallback stays active
    }
  }, [authToken, onUserEvent]);

  const subscribeConversation = useCallback(
    (conversationId: number, handler: ChannelHandler): (() => void) => {
      const client = clientRef.current;
      if (!client || convSubsRef.current.has(conversationId)) {
        return () => {};
      }

      const channel = `conversation:${conversationId}`;
      const sub = client.newSubscription(channel);
      convSubsRef.current.set(conversationId, sub);

      sub.on('publication', ({ data }) => {
        handler(data as CentrifugoEvent);
      });

      sub.subscribe();

      return () => {
        sub.unsubscribe();
        sub.removeAllListeners();
        client.removeSubscription(sub);
        convSubsRef.current.delete(conversationId);
      };
    },
    [],
  );

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      convSubsRef.current.forEach(sub => {
        sub.unsubscribe();
        sub.removeAllListeners();
      });
      convSubsRef.current.clear();

      userSubRef.current?.unsubscribe();
      userSubRef.current?.removeAllListeners();

      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [connect]);

  return { subscribeConversation };
}
