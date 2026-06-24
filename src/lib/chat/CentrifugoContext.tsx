import { Centrifuge, Subscription } from 'centrifuge';
import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { chatApi } from '@/lib/api/chat';

export type CentrifugoEvent = { event: string; [key: string]: unknown };
type Handler = (data: CentrifugoEvent) => void;

interface CentrifugoContextValue {
  /** Ref whose .current is updated synchronously in WebSocket callbacks — safe to read in intervals */
  isConnectedRef: React.RefObject<boolean>;
  /** Subscribe to a conversation channel. Returns an unsubscribe function. */
  subscribeConversation: (publicId: string, handler: Handler) => () => void;
  /** Register a handler for user-level events. Returns a remove function. */
  addUserEventHandler: (handler: Handler) => () => void;
  /** Register a callback that fires every time the WebSocket connects (including initial connect). Returns a remove function. */
  onConnect: (handler: () => void) => () => void;
}

const CentrifugoContext = createContext<CentrifugoContextValue>({
  isConnectedRef: { current: false },
  subscribeConversation: () => () => {},
  addUserEventHandler: () => () => {},
  onConnect: () => () => {},
});

export function CentrifugoProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const token = session?.accessToken;

  const isConnectedRef = useRef(false);
  const clientRef = useRef<Centrifuge | null>(null);
  const userHandlersRef = useRef<Set<Handler>>(new Set());
  const connectHandlersRef = useRef<Set<() => void>>(new Set());
  const convSubsRef = useRef<Map<string, Subscription>>(new Map());

  useEffect(() => {
    if (!token) {
      isConnectedRef.current = false;
      clientRef.current?.disconnect();
      clientRef.current = null;
      convSubsRef.current.clear();
      return;
    }

    if (clientRef.current) return;

    let destroyed = false;

    const init = async () => {
      try {
        const { token: rtToken, ws_url, channels } = await chatApi.getRealtimeToken(token);
        if (destroyed) return;

        if (!ws_url) {
          console.warn('[Centrifugo] ws_url is null — set CENTRIFUGO_URL in backend .env. Realtime disabled.');
          return;
        }

        const client = new Centrifuge(ws_url, { token: rtToken });
        clientRef.current = client;

        client.on('connected', () => {
          if (destroyed) return;
          isConnectedRef.current = true;
          console.log('[Centrifugo] connected ✓');
          connectHandlersRef.current.forEach(h => h());
        });
        client.on('disconnected', ({ code, reason }) => {
          if (!destroyed) isConnectedRef.current = false;
          console.warn('[Centrifugo] disconnected', { code, reason });
        });
        client.on('error', ({ error }) => {
          console.error('[Centrifugo] connection error', error);
        });

        const userSub = client.newSubscription(channels.user);
        userSub.on('publication', ({ data }) => {
          userHandlersRef.current.forEach(h => h(data as CentrifugoEvent));
        });
        userSub.on('error', ({ error }) => {
          console.error('[Centrifugo] user channel error', error);
        });
        userSub.subscribe();
        client.connect();
      } catch (err) {
        console.error('[Centrifugo] init failed', err);
      }
    };

    init();

    return () => {
      destroyed = true;
      isConnectedRef.current = false;
      convSubsRef.current.forEach(sub => {
        sub.unsubscribe();
        sub.removeAllListeners();
      });
      convSubsRef.current.clear();
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [token]);

  const subscribeConversation = useCallback((publicId: string, handler: Handler): (() => void) => {
    let cancelled = false;
    let sub: Subscription | null = null;

    const doSubscribe = () => {
      if (cancelled) return;
      const client = clientRef.current;
      if (!client) {
        setTimeout(doSubscribe, 400);
        return;
      }
      if (convSubsRef.current.has(publicId)) return;

      const channel = `conversation:${publicId}`;
      sub = client.newSubscription(channel);
      convSubsRef.current.set(publicId, sub);
      sub.on('publication', ({ data }) => handler(data as CentrifugoEvent));
      sub.on('error', ({ error }) => console.error('[Centrifugo] conv sub error', channel, error));
      sub.on('subscribed', () => console.log('[Centrifugo] subscribed to', channel));
      sub.subscribe();
    };

    doSubscribe();

    return () => {
      cancelled = true;
      if (sub) {
        sub.unsubscribe();
        sub.removeAllListeners();
        clientRef.current?.removeSubscription(sub);
        convSubsRef.current.delete(publicId);
      }
    };
  }, []);

  const addUserEventHandler = useCallback((handler: Handler): (() => void) => {
    userHandlersRef.current.add(handler);
    return () => { userHandlersRef.current.delete(handler); };
  }, []);

  const onConnect = useCallback((handler: () => void): (() => void) => {
    connectHandlersRef.current.add(handler);
    return () => { connectHandlersRef.current.delete(handler); };
  }, []);

  return (
    <CentrifugoContext.Provider value={{ isConnectedRef, subscribeConversation, addUserEventHandler, onConnect }}>
      {children}
    </CentrifugoContext.Provider>
  );
}

export const useCentrifugoCtx = () => useContext(CentrifugoContext);
