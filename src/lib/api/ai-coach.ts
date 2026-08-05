import { api } from './client';

export type CoachSession = {
  id: number;
  kind: 'coach' | 'match_assistant';
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type CoachMessage = {
  id: number;
  ai_coach_session_id: number;
  role: 'user' | 'assistant';
  body: string;
  metadata?: {
    suggestions?: {
      user_id: number;
      display_name?: string | null;
      age?: number | null;
      province?: string | null;
      relationship_goal?: string | null;
      compatibility_score?: number | null;
      reason: string;
    }[];
  } | null;
  created_at: string;
};

export type CoachSessionDetail = CoachSession & {
  messages: CoachMessage[];
};

export const aiCoachApi = {
  listSessions: (token: string, kind: CoachSession['kind'] = 'coach'): Promise<CoachSession[]> =>
    api.get<{ data: CoachSession[] }>(`/api/client/ai-coach/sessions?kind=${kind}`, token).then(r => r.data),

  createSession: (
    token: string,
    title?: string,
    kind: CoachSession['kind'] = 'coach',
    context?: Record<string, unknown>,
  ): Promise<CoachSession> =>
    api.post<{ data: CoachSession }>(
      '/api/client/ai-coach/sessions',
      { kind, ...(title ? { title } : {}), ...(context ? { context } : {}) },
      token,
    ).then(r => r.data),

  getSession: (token: string, id: number): Promise<CoachSessionDetail> =>
    api.get<{ data: CoachSessionDetail }>(`/api/client/ai-coach/sessions/${id}`, token).then(r => r.data),

  sendMessage: (token: string, id: number, message: string): Promise<CoachMessage> =>
    api.post<{ data: { assistant_message: CoachMessage } }>(`/api/client/ai-coach/sessions/${id}/messages`, { message }, token)
      .then(r => r.data.assistant_message),

  updateSession: (token: string, id: number, title: string): Promise<CoachSession> =>
    api.patch<{ data: CoachSession }>(`/api/client/ai-coach/sessions/${id}`, { title }, token).then(r => r.data),

  deleteSession: (token: string, id: number): Promise<void> =>
    api.delete(`/api/client/ai-coach/sessions/${id}`, token),
};
