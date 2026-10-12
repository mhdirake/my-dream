import type { Conversation, ConversationUser, Message } from '@/lib/api/chat';
import { useAuth } from '@/lib/auth/AuthContext';
import { unresolvedPeerIds } from './conversationIdentity';
import { useSenderDirectory } from './useSenderDirectory';

const NO_MESSAGES: Message[] = [];

export function useConversationPeer(conversation: Conversation, initial: ConversationUser): ConversationUser {
  const { session, user } = useAuth();
  const senders = useSenderDirectory(session?.accessToken ?? '', conversation.id, NO_MESSAGES,
    session?.userId ?? user?.id ?? -1, unresolvedPeerIds(conversation, initial));
  const resolved = senders.get(initial.id);
  return resolved ? { ...initial, ...resolved, first_name: resolved.first_name ?? '', username: resolved.username ?? '' } : initial;
}
