import { Centrifuge, Subscription } from 'centrifuge';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useTerms } from '@/lib/terms/TermsContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { chatApi } from '@/lib/api/chat';
import { ApiError } from '@/lib/api/client';
import { HeartbeatGate } from './heartbeatGate';

export type CentrifugoEvent = {
  event: string;
  event_id?: string;
  schema_version?: number;
  aggregate_sequence?: string;
  occurred_at?: string;
  payload?: unknown;
  [key: string]: unknown;
};
type Handler = (data: CentrifugoEvent) => void;
type ConnectionState = 'disabled' | 'connecting' | 'connected' | 'recovering' | 'disconnected' | 'failed';
type ConversationSubscription = {
  subscription: Subscription;
  handlers: Set<Handler>;
  gapHandlers: Set<() => void>;
};

interface CentrifugoContextValue {
  /** Ref whose .current is updated synchronously in WebSocket callbacks — safe to read in intervals */
  isConnectedRef: React.RefObject<boolean>;
  connectionState: ConnectionState;
  /** Subscribe to a conversation channel. Returns an unsubscribe function. */
  subscribeConversation: (publicId: string, handler: Handler, onGap?: () => void) => () => void;
  /** Register a handler for user-level events. Returns a remove function. */
  addUserEventHandler: (handler: Handler) => () => void;
  /** Register a callback that fires every time the WebSocket connects (including initial connect). Returns a remove function. */
  onConnect: (handler: () => void) => () => void;
}

const CentrifugoContext = createContext<CentrifugoContextValue>({
  isConnectedRef: { current: false },
  connectionState: 'disabled',
  subscribeConversation: () => () => {},
  addUserEventHandler: () => () => {},
  onConnect: () => () => {},
});

export function CentrifugoProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { canUseApp } = useTerms();
  const token = canUseApp ? session?.accessToken : undefined;

  const isConnectedRef = useRef(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disabled');
  const clientRef = useRef<Centrifuge | null>(null);
  const userHandlersRef = useRef<Set<Handler>>(new Set());
  const connectHandlersRef = useRef<Set<() => void>>(new Set());
  const convSubsRef = useRef<Map<string, ConversationSubscription>>(new Map());
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  const dispatchUnique = useCallback((data: CentrifugoEvent, handlers: Set<Handler>) => {
    if (data.event_id) {
      if (seenEventIdsRef.current.has(data.event_id)) return;
      seenEventIdsRef.current.add(data.event_id);
      if (seenEventIdsRef.current.size > 2000) {
        const oldest = seenEventIdsRef.current.values().next().value;
        if (oldest) seenEventIdsRef.current.delete(oldest);
      }
    }
    handlers.forEach(handler => handler(data));
  }, []);

  useEffect(() => {
    if (!token) {
      isConnectedRef.current = false;
      queueMicrotask(() => setConnectionState('disabled'));
      clientRef.current?.disconnect();
      clientRef.current = null;
      convSubsRef.current.clear();
      return;
    }

    if (clientRef.current) return;

    let destroyed = false;
    const conversationSubscriptions = convSubsRef.current;

    const init = async () => {
      try {
        const { token: rtToken, ws_url, channels } = await chatApi.getRealtimeToken(token);
        if (destroyed) return;

        if (!ws_url) {
          console.warn('[Centrifugo] ws_url is null — set CENTRIFUGO_URL in backend .env. Realtime disabled.');
          return;
        }

        const client = new Centrifuge(ws_url, {
          token: rtToken,
          getToken: async () => {
            const refreshed = await chatApi.getRealtimeToken(token);
            return refreshed.token;
          },
        });
        clientRef.current = client;

        client.on('connecting', () => {
          if (!destroyed) setConnectionState('connecting');
        });
        client.on('connected', () => {
          if (destroyed) return;
          isConnectedRef.current = true;
          setConnectionState('connected');
          console.log('[Centrifugo] connected ✓');
          connectHandlersRef.current.forEach(h => h());
        });
        client.on('disconnected', ({ code, reason }) => {
          if (!destroyed) isConnectedRef.current = false;
          if (!destroyed) setConnectionState('disconnected');
          console.warn('[Centrifugo] disconnected', { code, reason });
        });
        client.on('error', ({ error }) => {
          if (!destroyed) setConnectionState('failed');
          console.error('[Centrifugo] connection error', error);
        });

        const userSub = client.newSubscription(channels.user);
        userSub.on('publication', ({ data }) => {
          dispatchUnique(data as CentrifugoEvent, userHandlersRef.current);
        });
        userSub.on('subscribing', () => setConnectionState('recovering'));
        userSub.on('subscribed', ({ recovered }) => {
          setConnectionState('connected');
          if (recovered === false) connectHandlersRef.current.forEach(handler => handler());
        });
        userSub.on('error', ({ error }) => {
          console.error('[Centrifugo] user channel error', error);
        });
        userSub.subscribe();
        client.connect();
      } catch (err) {
        if (!destroyed) setConnectionState('failed');
        console.error('[Centrifugo] init failed', err);
      }
    };

    init();

    return () => {
      destroyed = true;
      isConnectedRef.current = false;
      conversationSubscriptions.forEach(entry => {
        entry.subscription.unsubscribe();
        entry.subscription.removeAllListeners();
      });
      conversationSubscriptions.clear();
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [token, dispatchUnique]);

  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const gate = new HeartbeatGate();
    let stopped = false;
    const heartbeat = async () => {
      if (stopped || AppState.currentState !== 'active' || !gate.begin()) return;
      try {
        await chatApi.heartbeat(token);
        gate.success();
      } catch (error) {
        const status = error instanceof ApiError ? error.status : 0;
        const retryAfter = error instanceof ApiError ? error.retryAfterSeconds ?? 0 : 0;
        gate.failure(status, retryAfter);
      } finally { gate.finish(); }
    };
    heartbeat();
    timer = setInterval(heartbeat, 30_000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') heartbeat();
    });
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      subscription.remove();
    };
  }, [token]);

  const subscribeConversation = useCallback((publicId: string, handler: Handler, onGap?: () => void): (() => void) => {
    let cancelled = false;

    const doSubscribe = () => {
      if (cancelled) return;
      const client = clientRef.current;
      if (!client) {
        setTimeout(doSubscribe, 400);
        return;
      }
      const existing = convSubsRef.current.get(publicId);
      if (existing) {
        existing.handlers.add(handler);
        if (onGap) existing.gapHandlers.add(onGap);
        return;
      }

      const channel = `conversation:${publicId}`;
      const sub = client.newSubscription(channel);
      const entry: ConversationSubscription = {
        subscription: sub,
        handlers: new Set([handler]),
        gapHandlers: new Set(onGap ? [onGap] : []),
      };
      convSubsRef.current.set(publicId, entry);
      sub.on('publication', ({ data }) => dispatchUnique(data as CentrifugoEvent, entry.handlers));
      sub.on('error', ({ error }) => console.error('[Centrifugo] conv sub error', channel, error));
      sub.on('subscribed', ({ recovered }) => {
        if (recovered === false) entry.gapHandlers.forEach(gapHandler => gapHandler());
      });
      sub.subscribe();
    };

    doSubscribe();

    return () => {
      cancelled = true;
      const entry = convSubsRef.current.get(publicId);
      if (entry) {
        entry.handlers.delete(handler);
        if (onGap) entry.gapHandlers.delete(onGap);
        if (entry.handlers.size > 0) return;
        entry.subscription.unsubscribe();
        entry.subscription.removeAllListeners();
        clientRef.current?.removeSubscription(entry.subscription);
        convSubsRef.current.delete(publicId);
      }
    };
  }, [dispatchUnique]);

  const addUserEventHandler = useCallback((handler: Handler): (() => void) => {
    userHandlersRef.current.add(handler);
    return () => { userHandlersRef.current.delete(handler); };
  }, []);

  const onConnect = useCallback((handler: () => void): (() => void) => {
    connectHandlersRef.current.add(handler);
    return () => { connectHandlersRef.current.delete(handler); };
  }, []);

  return (
    <CentrifugoContext.Provider value={{ isConnectedRef, connectionState, subscribeConversation, addUserEventHandler, onConnect }}>
      {children}
    </CentrifugoContext.Provider>
  );
}

export const useCentrifugoCtx = () => useContext(CentrifugoContext);
