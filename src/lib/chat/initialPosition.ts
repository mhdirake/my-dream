export type InitialChatPosition =
  | { kind: 'resolving' }
  | { kind: 'tail' }
  | { kind: 'message'; id: string; viewPosition: number };

export function selectInitialChatPosition({
  targetMessageId,
  firstUnreadMessageId,
  isGroup,
}: {
  targetMessageId?: string;
  firstUnreadMessageId?: string | null;
  isGroup: boolean;
}): Exclude<InitialChatPosition, { kind: 'resolving' }> {
  if (targetMessageId) {
    return { kind: 'message', id: targetMessageId, viewPosition: 0.5 };
  }

  if (!isGroup && firstUnreadMessageId) {
    return { kind: 'message', id: firstUnreadMessageId, viewPosition: 0.1 };
  }

  return { kind: 'tail' };
}
