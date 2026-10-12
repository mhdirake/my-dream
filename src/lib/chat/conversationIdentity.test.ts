import { describe, expect, it, vi } from 'vitest';
import type { Conversation, ConversationUser } from '@/lib/api/chat';
import { conversationPeer, conversationPeerName, unresolvedPeerIds } from './conversationIdentity';
import { SenderDirectory } from './senderDirectory';

const person = (id: number, first_name = 'Sara'): ConversationUser => ({
  id, username: '', first_name, last_name: null, profile_photo: null,
});
const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 7, public_id: 'test-conversation', status: 'accepted', type: 'direct',
  first_user_id: 1, second_user_id: 2, first_user: person(1), second_user: person(2),
  last_message_at: null, last_message_preview: null, last_message_type: null,
  last_message_sender_user_id: null, pending_expires_at: null, accepted_at: null,
  ...overrides,
});

describe('conversation-list identities', () => {
  it('keeps the authorized peer ID when its summary is missing so it can be fetched', () => {
    const c = conversation({ second_user: null });
    const peer = conversationPeer(c, 1);
    expect(peer.id).toBe(2);
    expect(conversationPeerName(c, peer)).toBe('در حال دریافت نام…');
    expect(unresolvedPeerIds(c, peer)).toEqual([2]);
    expect(conversationPeer(conversation({ first_user: null }), 2).id).toBe(1);
  });

  it('never exposes another summary for an unknown account or mismatched identity', () => {
    expect(conversationPeer(conversation(), 99).id).toBe(0);
    expect(conversationPeer(conversation({ second_user: person(99) }), 1).id).toBe(2);
    expect(unresolvedPeerIds(conversation(), conversationPeer(conversation(), 99))).toEqual([]);
  });

  it.each(['123', '۱۲۳', 'کاربر 123', 'کاربر', 'unknown'])('does not display the placeholder %s', first_name => {
    const c = conversation({ second_user: person(2, first_name) });
    const peer = conversationPeer(c, 1);
    expect(conversationPeerName(c, peer)).toBe('در حال دریافت نام…');
    expect(unresolvedPeerIds(c, peer)).toEqual([2]);
  });

  it('does not fetch complete names on every row render or require a profile photo', () => {
    const c = conversation();
    const peer = conversationPeer(c, 1);
    expect(conversationPeerName(c, peer)).toBe('Sara');
    expect(unresolvedPeerIds(c, peer)).toEqual([]);
  });

  it('uses the existing bounded retry directory for incomplete list identities', async () => {
    const c = conversation({ second_user: null });
    const initial = conversationPeer(c, 1);
    const fetch = vi.fn().mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce([person(2, 'Maryam')]);
    const directory = new SenderDirectory(fetch, vi.fn(), '1:7');
    await directory.resolve(unresolvedPeerIds(c, initial));
    await directory.retryUnresolved();
    expect(conversationPeerName(c, directory.senders.get(2)!)).toBe('Maryam');
    expect(fetch).toHaveBeenCalledTimes(2);
    directory.stop();
  });

  it('preserves group titles and never fetches a group as a person', () => {
    const c = conversation({ type: 'group', group_title: '123', first_user_id: null, second_user_id: null });
    const peer = conversationPeer(c, 1);
    expect(conversationPeerName(c, peer)).toBe('123');
    expect(unresolvedPeerIds(c, peer)).toEqual([]);
  });
});
