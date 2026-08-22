import { describe, expect, it } from 'vitest';
import {
  type AppNotification,
  giftNotificationDetail,
  isGroupMessageNotification,
} from './notifications';

function notification(
  type: string,
  metadata: Record<string, unknown> | null,
): AppNotification {
  return {
    id: 1,
    type,
    title: null,
    body: null,
    related_user: null,
    metadata,
    read_at: null,
    created_at: '2026-08-05T10:00:00.000Z',
  };
}

describe('isGroupMessageNotification', () => {
  it('hides message notifications explicitly marked as group conversations', () => {
    expect(isGroupMessageNotification(
      notification('chat_message_created', { conversation_type: 'group' }),
    )).toBe(true);
  });

  it('recognizes nested group conversation metadata', () => {
    expect(isGroupMessageNotification(
      notification('new_message', { conversation: { type: 'group' } }),
    )).toBe(true);
  });

  it('keeps direct message notifications', () => {
    expect(isGroupMessageNotification(
      notification('message_received', { conversation_type: 'direct', conversation_id: 7 }),
    )).toBe(false);
  });

  it('keeps important conversation events even when they relate to a group', () => {
    expect(isGroupMessageNotification(
      notification('conversation_request_accepted', { conversation_type: 'group' }),
    )).toBe(false);
  });

  it('recognizes explicit group-message notification types', () => {
    expect(isGroupMessageNotification(
      notification('group_message_received', null),
    )).toBe(true);
  });
});

describe('giftNotificationDetail', () => {
  it('shows the catalog gift title', () => {
    expect(giftNotificationDetail(
      notification('gift_received', { gift_kind: 'catalog_gift', gift_title: 'رز رویایی' }),
    )).toBe('هدیه: رز رویایی');
  });

  it('translates known English catalog gift titles to Persian', () => {
    expect(giftNotificationDetail(
      notification('gift_received', { gift_kind: 'catalog_gift', gift_title: 'Dream Rose' }),
    )).toBe('هدیه: گل رز رویایی');
  });

  it('isolates latin catalog gift titles with no known translation', () => {
    expect(giftNotificationDetail(
      notification('gift_received', { gift_kind: 'catalog_gift', gift_title: 'Custom Gift' }),
    )).toBe('هدیه: \u2068Custom Gift\u2069');
  });

  it('shows the received coin amount', () => {
    expect(giftNotificationDetail(
      notification('gift_received', { gift_kind: 'coin_gift', amount: 250 }),
    )).toBe('۲۵۰ سکه');
  });

  it('shows the subscription plan and duration', () => {
    expect(giftNotificationDetail(
      notification('gift_received', {
        gift_kind: 'subscription',
        plan_slug: 'gold',
        duration_days: 30,
      }),
    )).toBe('اشتراک طلایی، ۳۰ روزه');
  });
});
