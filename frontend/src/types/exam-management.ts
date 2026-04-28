import type { AttemptStatus, ExamStatus, OpenType, RejoinRequestStatus } from './common';
import type { Question } from './question-bank';

export interface ExamQuestionConfig {
  questionId: number;
  orderNo: number;
  scoreOverride?: number | null;
  question?: Question;
}

export interface Exam {
  id: number;
  title: string;
  description?: string | null;
  durationMinutes: number;
  passScore: number;
  maxAttempts?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status: ExamStatus;
  isPublished: boolean;
  openType: OpenType;
  allowedUserIds?: number[];
  allowedRoleIds?: number[];
  allowReview: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  antiCheatEnabled: boolean;
  antiCheatThreshold: number;
  showResultMode: 'IMMEDIATE' | 'AFTER_SUBMIT' | 'MANUAL';
  examQuestions: ExamQuestionConfig[];
  creator?: { id: number; username: string; displayName?: string | null } | null;
  _count?: { attempts: number };
}

export interface ExamScoreboardRow {
  id: number;
  attemptNo: number;
  userId: number;
  username: string;
  displayName?: string | null;
  status: AttemptStatus;
  score?: number | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  antiCheatViolationCount: number;
}

export interface ExamScoreboardResult {
  total: number;
  page: number;
  pageSize: number;
  latestOnly?: boolean;
  stats?: {
    participantCount: number;
    avgScore: number;
    passRate: number;
  };
  rows: ExamScoreboardRow[];
}

export interface ExamMonitorRow {
  attemptId: number;
  examId: number;
  userId: number;
  username: string;
  displayName?: string | null;
  status: AttemptStatus;
  startedAt: string;
  submittedAt?: string | null;
  lastSavedAt?: string | null;
  lastActivityAt?: string | null;
  latestAntiCheatAt?: string | null;
  antiCheatViolationCount: number;
  questionCount: number;
  answeredCount: number;
  progressPercent: number;
  hasPendingRejoinRequest: boolean;
}

export interface ExamMonitorResult {
  examId: number;
  total: number;
  page: number;
  pageSize: number;
  rows: ExamMonitorRow[];
}

export interface ExamRejoinRequestRow {
  id: number;
  attemptId: number;
  examId: number;
  studentId: number;
  reason?: string | null;
  status: RejoinRequestStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  student: { id: number; username: string; displayName?: string | null };
  reviewer?: { id: number; username: string; displayName?: string | null } | null;
  attempt: {
    id: number;
    status: AttemptStatus;
    antiCheatViolationCount: number;
    startedAt: string;
    submittedAt?: string | null;
  };
}

export interface DashboardOverview {
  stats: {
    examCount: number;
    publishedExamCount: number;
    ongoingExamCount: number;
    repositoryCount: number;
    questionCount: number;
    userCount: number;
  };
  shortcuts: Array<{ key: string; title: string; path: string }>;
  recentExams: Exam[];
  recentRepositories: Array<{ id: number; name: string; category?: string | null; _count?: { questions: number } }>;
}

