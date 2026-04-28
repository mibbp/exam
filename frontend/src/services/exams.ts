import api from './client';
import type { Exam, ExamMonitorResult, ExamRejoinRequestRow, ExamScoreboardResult, ExamScoreboardRow, PagedResult } from '../types';

export async function listExams(params?: Record<string, unknown>) {
  const { data } = await api.get<PagedResult<Exam>>('/exams', { params });
  return data;
}

export async function getExam(id: number) {
  const { data } = await api.get<Exam>(`/exams/${id}`);
  return data;
}

export async function createExam(payload: Record<string, unknown>) {
  const { data } = await api.post<Exam>('/exams', payload);
  return data;
}

export async function updateExam(id: number, payload: Record<string, unknown>) {
  const { data } = await api.patch<Exam>(`/exams/${id}`, payload);
  return data;
}

export async function publishExam(id: number) {
  await api.post(`/exams/${id}/publish`);
}

export async function unpublishExam(id: number) {
  await api.post(`/exams/${id}/unpublish`);
}

export async function closeExam(id: number) {
  await api.post(`/exams/${id}/close`);
}

export async function deleteExam(id: number) {
  await api.delete(`/exams/${id}`);
}

export async function examScoreboard(examId: number, params?: Record<string, unknown>) {
  const { data } = await api.get<ExamScoreboardResult>(`/exams/${examId}/scoreboard`, { params });
  return data;
}

export async function exportExamResults(examId: number) {
  const { data } = await api.get(`/exams/${examId}/results/export`);
  return data as { rows: ExamScoreboardRow[] };
}

export async function examMonitor(examId: number, params?: Record<string, unknown>) {
  const { data } = await api.get<ExamMonitorResult>(`/exams/${examId}/monitor`, { params });
  return data;
}

export async function examRejoinRequests(examId: number, params?: Record<string, unknown>) {
  const { data } = await api.get<ExamRejoinRequestRow[]>(`/exams/${examId}/rejoin-requests`, { params });
  return data;
}

export async function approveRejoinRequest(id: number, reviewNote?: string) {
  const { data } = await api.post<ExamRejoinRequestRow>(`/rejoin-requests/${id}/approve`, { reviewNote });
  return data;
}

export async function rejectRejoinRequest(id: number, reviewNote?: string) {
  const { data } = await api.post<ExamRejoinRequestRow>(`/rejoin-requests/${id}/reject`, { reviewNote });
  return data;
}

