import { api } from './client';
export type SubscriptionItem = { id:number; plan:{slug:string;name:string}; status:string; sources?:{source_type:string|null;sender_name:string|null;duration_seconds:number|null;received_at:string|null}[]; starts_at:string|null; ends_at:string|null };
export type SubscriptionReceipt = SubscriptionItem & {subscription_id:number|null;duration_seconds:number|null;received_at:string|null;source_type:string|null;sender_name:string|null};
export type SubscriptionsResponse = {active:SubscriptionItem[];queued:SubscriptionItem[];history:{data:SubscriptionReceipt[];current_page:number;last_page:number;total:number}};
export const subscriptionsApi = { list:(token:string,page=1) => api.get<SubscriptionsResponse>(`/api/client/subscriptions?page=${page}`,token) };
