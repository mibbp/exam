import api from './client';
import type { PagedResult, QuestionRepository } from '../types';

export async function listRepositories(params?: Record<string, unknown>) {
  const { data } = await api.get<PagedResult<QuestionRepository>>('/question-repositories', { params });
  return data;
}

export async function createRepository(payload: Partial<QuestionRepository>) {
  const { data } = await api.post<QuestionRepository>('/question-repositories', payload);
  return data;
}

export async function updateRepository(id: number, payload: Partial<QuestionRepository>) {
  const { data } = await api.patch<QuestionRepository>(`/question-repositories/${id}`, payload);
  return data;
}

