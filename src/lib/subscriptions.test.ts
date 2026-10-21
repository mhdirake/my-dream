import {describe,it,expect} from 'vitest';
import {subscriptionDate,subscriptionSource,subscriptionStatus} from './subscriptions';
import {photoStatusLabel} from './profilePhoto';
describe('owner account presentation',()=>{
 it('uses Persian calendar and digits and explicit unknown dates',()=>{
 expect(subscriptionDate('2026-10-22T12:00:00Z')).toContain('۱۴۰۵');
 expect(subscriptionDate(null)).toBe('نامشخص');expect(subscriptionDate('broken')).toBe('نامشخص');
 });
 it('labels queued grants and never invents an unknown source',()=>{
 expect(subscriptionStatus('queued')).toBe('در صف فعال‌سازی');
 expect(subscriptionSource('subscription_gift')).toBe('هدیه');expect(subscriptionSource('invalid')).toBe('منبع نامشخص');
 });
 it('explains every moderation state',()=>{
 expect(['pending','needs_review','approved','rejected'].map(photoStatusLabel)).toEqual(['در انتظار بررسی','نیازمند بررسی دستی','تأییدشده','ردشده']);
 });
});
