import api from './client';
import type { AttemptDetail, AttemptResult, MyExamAvailable, MyExamGrouped, MyExamHistory, MyExamRecordList, WrongQuestion } from '../types';

export async function startAttempt(examId: number) {
  const { data } = await api.post('/attempts/start', { examId });
  return data as { id: number; examId: number };
}

export async function getAttempt(attemptId: number) {
  const { data } = await api.get<AttemptDetail>(`/attempts/${attemptId}`);
  return data;
}

export async function getAttemptResult(attemptId: number) {
  const { data } = await api.get<AttemptResult>(`/attempts/${attemptId}/result`);
  return data;
}

export async function getAttemptQuestionNav(attemptId: number) {
  const { data } = await api.get(`/attempts/${attemptId}/question-nav`);
  return data as { attemptId: number; items: Array<{ questionId: number; answered: boolean; isCorrect?: boolean | null }> };
}

export async function saveAnswer(attemptId: number, questionId: number, answer: string) {
  await api.patch(`/attempts/${attemptId}/answers/${questionId}`, { answer });
}

export async function submitAttempt(attemptId: number) {
  const { data } = await api.post(`/attempts/${attemptId}/submit`);
  return data;
}

export async function reportAntiCheat(attemptId: number, eventType: string, message?: string) {
  const { data } = await api.post('/anti-cheat/events', { attemptId, eventType, message });
  return data as { forcedSubmit: boolean; antiCheatViolationCount: number };
}

export async function listMyExams() {
  const { data } = await api.get('/my-exams');
  return data as { available: MyExamAvailable[]; history: MyExamHistory[]; grouped?: MyExamGrouped[] };
}

export async function listMyExamRecords(examId: number) {
  const { data } = await api.get<MyExamRecordList>(`/my-exams/${examId}/records`);
  return data;
}

export async function listMyWrongQuestions(attemptId?: number) {
  const { data } = await api.get<WrongQuestion[]>('/my-wrong-questions', {
    params: attemptId ? { attemptId } : undefined,
  });
  return data;
}

export async function createRejoinRequest(attemptId: number, reason?: string) {
  const { data } = await api.post(`/attempts/${attemptId}/rejoin-requests`, { reason });
  return data as { id: number; status: 'PENDING' | 'APPROVED' | 'REJECTED' };
}

