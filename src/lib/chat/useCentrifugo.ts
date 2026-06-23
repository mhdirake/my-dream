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
  onUserEvent?: ChannelHandler;
}

export function useCentrifugo({ authToken, onUserEvent }: UseCentrifugoOptions) {
  const clientRef = useRef<Centrifuge | null>(null);
  const userSubRef = useRef<Subscription | null>(null);
  const convSubsRef = useRef<Map<string, Subscription>>(new Map());
  // Use a ref for the callback so it never causes connect() to re-run
  const onUserEventRef = useRef<ChannelHandler | undefined>(onUserEvent);
  onUserEventRef.current = onUserEvent;

  const connect = useCallback(async () => {
    if (!authToken || clientRef.current) return;

    try {
      const { token, ws_url, channels } = await chatApi.getRealtimeToken(authToken);

      const client = new Centrifuge(ws_url, { token });
      clientRef.current = client;

      const userSub = client.newSubscription(channels.user);
      userSubRef.current = userSub;

      userSub.on('publication', ({ data }) => {
        onUserEventRef.current?.(data as CentrifugoEvent);
      });

      userSub.subscribe();
      client.connect();
    } catch {
      // silent — polling fallback stays active
    }
  }, [authToken]); // onUserEvent intentionally excluded — read via ref to avoid reconnect loop

  const subscribeConversation = useCallback(
    (publicId: string, handler: ChannelHandler): (() => void) => {
      let cancelled = false;
      let sub: Subscription | null = null;

      const trySubscribe = () => {
        if (cancelled) return;
        const client = clientRef.current;
        if (!client) {
          setTimeout(trySubscribe, 300);
          return;
        }
        if (convSubsRef.current.has(publicId)) return;

        const channel = `conversation:${publicId}`;
        sub = client.newSubscription(channel);
        convSubsRef.current.set(publicId, sub);
        sub.on('publication', ({ data }) => handler(data as CentrifugoEvent));
        sub.subscribe();
      };

      trySubscribe();

      return () => {
        cancelled = true;
        if (sub) {
          sub.unsubscribe();
          sub.removeAllListeners();
          clientRef.current?.removeSubscription(sub);
          convSubsRef.current.delete(publicId);
        }
      };
    },
    [],
  );

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
