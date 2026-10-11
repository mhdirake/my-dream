import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useFocusEffect } from 'expo-router';
import { chatApi, type Message } from '@/lib/api/chat';
import { SenderDirectory } from './senderDirectory';

export function useSenderDirectory(token: string, conversationId: number, messages: Message[], accountId: number, extraIds: number[] = []) {
  const [, update] = useReducer(value => value + 1, 0);
  const scope = `${accountId}:${conversationId}`;
  const directory = useMemo(() => {
    // The account and conversation define the privacy boundary, not each refreshed JWT.
    return new SenderDirectory(async () => [], update, scope);
  }, [scope]);
  useEffect(() => {
    directory.setFetcher(ids => chatApi.getSenders(token, conversationId, ids));
  }, [directory, token, conversationId]);

  useEffect(() => {
    directory.start();
    return () => directory.stop();
  }, [directory]);

  useFocusEffect(useCallback(() => {
    if (token) void directory.retryUnresolved();
  }, [directory, token]));

  const extraKey = extraIds.join(',');

  useEffect(() => {
    if (!token || conversationId <= 0) return;
    void directory.resolve([...messages.map(message => message.sender_user_id), ...extraKey.split(',').map(Number)]);
  }, [token, conversationId, messages, directory, extraKey]);

  return directory.senders;
}
