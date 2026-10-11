import { useEffect, useMemo, useReducer } from 'react';
import { chatApi, type Message } from '@/lib/api/chat';
import { SenderDirectory } from './senderDirectory';

export function useSenderDirectory(token: string, conversationId: number, messages: Message[]) {
  const [, update] = useReducer(value => value + 1, 0);
  const directory = useMemo(() => new SenderDirectory(
    ids => chatApi.getSenders(token, conversationId, ids), update,
  ), [token, conversationId]);

  useEffect(() => {
    if (!token || conversationId <= 0) return;
    void directory.resolve(messages.map(message => message.sender_user_id));
  }, [token, conversationId, messages, directory]);

  return directory.senders;
}
