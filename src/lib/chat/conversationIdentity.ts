import type { Conversation, ConversationUser, MessageSender } from '@/lib/api/chat';
import { displayUserName } from './senderDirectory';

export function conversationPeer(conversation: Conversation, myId: number): ConversationUser {
  if (conversation.type === 'group') {
    return { id: 0, username: conversation.group_key ?? 'group', first_name: conversation.group_title ?? 'گفتگوی گروهی', last_name: null, profile_photo: null };
  }
  const peerId = conversation.first_user_id === myId ? conversation.second_user_id
    : conversation.second_user_id === myId ? conversation.first_user_id : null;
  const peer = conversation.first_user_id === myId ? conversation.second_user
    : conversation.second_user_id === myId ? conversation.first_user : null;
  return peer && peer.id === peerId ? peer : {
    id: peerId ?? 0, username: '', first_name: '', last_name: null, profile_photo: null,
  };
}

export function conversationPeerName(conversation: Pick<Conversation, 'type' | 'group_title'>, peer: Partial<MessageSender>): string {
  return conversation.type === 'group' ? conversation.group_title || 'گفتگوی گروهی' : displayUserName(peer);
}

export function unresolvedPeerIds(conversation: Pick<Conversation, 'type'>, peer: MessageSender): number[] {
  return conversation.type === 'direct' && peer.id > 0 && !displayUserName(peer, '') ? [peer.id] : [];
}
