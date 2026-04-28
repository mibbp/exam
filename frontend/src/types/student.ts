import type { AttemptStatus, RejoinRequestStatus } from './common';
import type { Question } from './question-bank';

export interface MyExamAvailable {
  examId: number;
  title: string;
  durationMinutes: number;
  startsAt?: string | null;
  endsAt?: string | null;
  questionCount: number;
  canStart: boolean;
  status: 'UPCOMING' | 'READY' | 'ONGOING' | 'FINISHED';
  displayStatus: 'CAN_START' | 'NO_QUOTA' | 'NOT_STARTED' | 'ENDED' | 'IN_PROGRESS';
  cta: 'START' | 'CONTINUE' | 'VIEW_RESULT' | 'VIEW_RECORDS';
  ctaAttemptId?: number | null;
  attemptId?: number | null;
  score?: number | null;
  totalScore: number;
  passScore: number;
  remainingAttempts?: number | null;
  maxAttempts?: number | null;
}

export interface MyExamHistory {
  attemptId: number;
  examId: number;
  title: string;
  status: AttemptStatus;
  score?: number | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  wrongCount: number;
  passScore: number;
  attemptNo: number;
  totalScore: number;
  canRetake: boolean;
  canViewResult: boolean;
  isLatest?: boolean;
}

export interface MyExamGroupedAttempt {
  attemptId: number;
  attemptNo: number;
  status: AttemptStatus;
  score?: number | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  wrongCount: number;
  passScore: number;
  totalScore: number;
  canRetake: boolean;
  canViewResult: boolean;
  isLatest: boolean;
}

export interface MyExamGrouped {
  examId: number;
  title: string;
  durationMinutes: number;
  startsAt?: string | null;
  endsAt?: string | null;
  questionCount: number;
  passScore: number;
  totalScore: number;
  latestAttempt: MyExamGroupedAttempt | null;
  finalScore?: number | null;
  canRetake: boolean;
  attempts: MyExamGroupedAttempt[];
}

export interface ExamAttemptRecord {
  attemptId: number;
  attemptNo: number;
  status: AttemptStatus;
  score: number;
  wrongCount: number;
  startedAt?: string | null;
  submittedAt?: string | null;
  canViewResult: boolean;
  isLatest?: boolean;
}

export interface MyExamRecordList {
  examId: number;
  examTitle: string;
  totalScore: number;
  passScore: number;
  records: ExamAttemptRecord[];
}

export interface AttemptResultQuestion {
  questionId: number;
  type: string;
  content: string;
  options: string[];
  myAnswer: string;
  answer: string;
  analysis: string;
  isCorrect: boolean;
  score: number;
  fullScore: number;
}

export interface AttemptResult {
  attemptId: number;
  examId: number;
  examTitle: string;
  status: AttemptStatus;
  showResultMode: 'IMMEDIATE' | 'AFTER_SUBMIT' | 'MANUAL';
  resultAvailable: boolean;
  message?: string;
  score: number;
  totalScore: number;
  passScore: number;
  wrongCount: number;
  passed?: boolean;
  submittedAt?: string | null;
  startedAt?: string | null;
  durationSeconds?: number;
  rejoinRequest?: {
    id: number;
    status: RejoinRequestStatus;
    reason?: string | null;
    reviewNote?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
    reviewer?: { id: number; username: string; displayName?: string | null } | null;
  } | null;
  questions?: AttemptResultQuestion[];
}

export interface WrongQuestion {
  attemptId: number;
  examId: number;
  examTitle: string;
  questionId: number;
  questionType: string;
  content: string;
  options: string[];
  analysis?: string | null;
  myAnswer?: string | null;
  answer: string;
  score: number;
  fullScore: number;
}

export interface AttemptDetail {
  id: number;
  examId: number;
  userId: number;
  attemptNo: number;
  status: AttemptStatus;
  startedAt: string;
  submittedAt?: string | null;
  score?: number | null;
  durationSeconds?: number | null;
  antiCheatViolationCount: number;
  exam: {
    id: number;
    title: string;
    durationMinutes: number;
    passScore: number;
    antiCheatEnabled: boolean;
    antiCheatThreshold: number;
  };
  details: Array<{
    questionId: number;
    answer?: string | null;
    isCorrect?: boolean | null;
    score?: number | null;
    question: Question;
  }>;
}

