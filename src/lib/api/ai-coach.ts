import { api } from './client';

export type CoachSession = {
  id: number;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type CoachMessage = {
  id: number;
  session_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type CoachSessionDetail = CoachSession & {
  messages: CoachMessage[];
};

export const aiCoachApi = {
  listSessions: (token: string): Promise<CoachSession[]> =>
    api.get<{ data: CoachSession[] }>('/api/client/ai-coach/sessions', token).then(r => r.data),

  createSession: (token: string, title?: string): Promise<CoachSession> =>
    api.post<{ data: CoachSession }>('/api/client/ai-coach/sessions', title ? { title } : {}, token).then(r => r.data),

  getSession: (token: string, id: number): Promise<CoachSessionDetail> =>
    api.get<{ data: CoachSessionDetail }>(`/api/client/ai-coach/sessions/${id}`, token).then(r => r.data),

  sendMessage: (token: string, id: number, message: string): Promise<CoachMessage> =>
    api.post<{ data: CoachMessage }>(`/api/client/ai-coach/sessions/${id}/messages`, { message }, token).then(r => r.data),

  updateSession: (token: string, id: number, title: string): Promise<CoachSession> =>
    api.patch<{ data: CoachSession }>(`/api/client/ai-coach/sessions/${id}`, { title }, token).then(r => r.data),

  deleteSession: (token: string, id: number): Promise<void> =>
    api.delete(`/api/client/ai-coach/sessions/${id}`, token),
};
