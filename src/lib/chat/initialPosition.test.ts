import { describe, expect, it } from 'vitest';
import { selectInitialChatPosition } from './initialPosition';

describe('selectInitialChatPosition', () => {
  it('places a direct conversation on its first unread message', () => {
    expect(selectInitialChatPosition({
      isGroup: false,
      firstUnreadMessageId: 'message-unread',
    })).toEqual({
      kind: 'message',
      id: 'message-unread',
      viewPosition: 0.1,
    });
  });

  it('opens a fully read direct conversation at the tail', () => {
    expect(selectInitialChatPosition({
      isGroup: false,
      firstUnreadMessageId: null,
    })).toEqual({ kind: 'tail' });
  });

  it('gives an explicit notification target precedence', () => {
    expect(selectInitialChatPosition({
      isGroup: false,
      targetMessageId: 'message-target',
      firstUnreadMessageId: 'message-unread',
    })).toEqual({
      kind: 'message',
      id: 'message-target',
      viewPosition: 0.5,
    });
  });

  it('keeps ordinary group conversations at the tail', () => {
    expect(selectInitialChatPosition({
      isGroup: true,
      firstUnreadMessageId: 'message-unread',
    })).toEqual({ kind: 'tail' });
  });
});
