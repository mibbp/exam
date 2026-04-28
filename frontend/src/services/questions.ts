import api from './client';
import type { PagedResult, Question } from '../types';

export async function listQuestions(params?: Record<string, unknown>) {
  const { data } = await api.get<PagedResult<Question>>('/questions', { params });
  return data;
}

export async function createQuestion(payload: Partial<Question>) {
  const { data } = await api.post<Question>('/questions', payload);
  return data;
}

export async function updateQuestion(id: number, payload: Partial<Question>) {
  const { data } = await api.patch<Question>(`/questions/${id}`, payload);
  return data;
}

export async function deleteQuestion(id: number) {
  await api.delete(`/questions/${id}`);
}

export async function importQuestions(file: File, repositoryId?: number) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/questions/import', formData, {
    params: repositoryId ? { repositoryId } : undefined,
  });
  return data as { total: number; successCount: number; errors: Array<{ row: number; reason: string }> };
}

export async function exportQuestions(repositoryId?: number) {
  const { data } = await api.get('/questions/export', { params: repositoryId ? { repositoryId } : undefined });
  return data as { rows: Question[] };
}

export async function exportQuestionsFile(repositoryId?: number) {
  const { data } = await api.get<Blob>('/questions/export-file', {
    params: repositoryId ? { repositoryId } : undefined,
    responseType: 'blob',
  });
  return data;
}

export async function downloadQuestionImportTemplate() {
  const { data } = await api.get<Blob>('/questions/import-template', {
    responseType: 'blob',
  });
  return data;
}

