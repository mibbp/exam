import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  AttemptStatus,
  ExamStatus,
  OpenType,
  type Exam,
  type ExamRecordDetail,
  type Question,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtUser } from '../auth/decorators/current-user.decorator';

type DisplayStatus = 'CAN_START' | 'NO_QUOTA' | 'NOT_STARTED' | 'ENDED' | 'IN_PROGRESS';
type CtaType = 'START' | 'CONTINUE' | 'VIEW_RESULT' | 'VIEW_RECORDS';

@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  private examAccessibleForUser(
    exam: { openType: OpenType; allowedUserIds: unknown; allowedRoleIds: unknown },
    user: JwtUser,
  ) {
    if (exam.openType === 'PUBLIC') return true;
    if (exam.openType === 'USERS') {
      return Array.isArray(exam.allowedUserIds) && exam.allowedUserIds.includes(user.sub);
    }
    if (exam.openType === 'ROLES') {
      return Array.isArray(exam.allowedRoleIds)
        && exam.allowedRoleIds.some((roleId) => (user.roleIds ?? []).includes(Number(roleId)));
    }
    return false;
  }

  private normalizeAnswer(input: string) {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(',');
  }

  private examTotalScore(examQuestions: Array<{ scoreOverride: number | null }>) {
    return examQuestions.reduce((sum, item) => sum + (item.scoreOverride ?? 0), 0);
  }

  private canStudentViewResult(exam: Pick<Exam, 'showResultMode'>, status: AttemptStatus) {
    if (status === AttemptStatus.IN_PROGRESS) {
      return false;
    }
    return exam.showResultMode === 'AFTER_SUBMIT' || exam.showResultMode === 'IMMEDIATE';
  }

  private resolveDisplay(
    exam: Pick<Exam, 'maxAttempts' | 'startsAt' | 'endsAt'>,
    attempts: Array<{ id: number; status: AttemptStatus }>,
  ) {
    const now = new Date();
    const startReady = !exam.startsAt || now >= exam.startsAt;
    const notEnded = !exam.endsAt || now <= exam.endsAt;
    const inProgress = attempts.find((item) => item.status === AttemptStatus.IN_PROGRESS) ?? null;
    const remainingAttempts = exam.maxAttempts ? Math.max(exam.maxAttempts - attempts.length, 0) : null;
    const canStart = startReady && notEnded && (!exam.maxAttempts || attempts.length < exam.maxAttempts) && !inProgress;

    let displayStatus: DisplayStatus = 'CAN_START';
    let cta: CtaType = 'START';
    let ctaAttemptId: number | null = null;

    if (inProgress) {
      displayStatus = 'IN_PROGRESS';
      cta = 'CONTINUE';
      ctaAttemptId = inProgress.id;
    } else if (!startReady) {
      displayStatus = 'NOT_STARTED';
      cta = 'VIEW_RECORDS';
    } else if (!notEnded) {
      displayStatus = 'ENDED';
      cta = 'VIEW_RECORDS';
    } else if (!canStart) {
      displayStatus = 'NO_QUOTA';
      const latestFinished = attempts.find((item) => item.status !== AttemptStatus.IN_PROGRESS);
      if (latestFinished) {
        cta = 'VIEW_RESULT';
        ctaAttemptId = latestFinished.id;
      } else {
        cta = 'VIEW_RECORDS';
      }
    }

    return {
      startReady,
      notEnded,
      inProgress,
      canStart,
      remainingAttempts,
      displayStatus,
      cta,
      ctaAttemptId,
    };
  }

  private async ensureAttemptDetails(attemptId: number) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: { include: { examQuestions: { orderBy: { orderNo: 'asc' } } } },
        details: true,
      },
    });
    if (!attempt) {
      return null;
    }

    const existingQuestionIds = new Set(attempt.details.map((detail) => detail.questionId));
    const missing = attempt.exam.examQuestions.filter((item) => !existingQuestionIds.has(item.questionId));

    if (missing.length > 0) {
      await this.prisma.examRecordDetail.createMany({
        data: missing.map((item) => ({ attemptId, questionId: item.questionId })),
        skipDuplicates: true,
      });
    }

    return this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: { examQuestions: { include: { question: true }, orderBy: { orderNo: 'asc' } } },
        },
        details: {
          include: { question: true },
          orderBy: { questionId: 'asc' },
        },
      },
    });
  }

  async start(examId: number, user: JwtUser) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: { include: { question: true }, orderBy: { orderNo: 'asc' } },
      },
    });
    if (!exam || (exam.status !== ExamStatus.PUBLISHED && !exam.isPublished)) {
      throw new BadRequestException('Exam not available');
    }
    if (!this.examAccessibleForUser(exam, user)) {
      throw new ForbiddenException('No permission');
    }

    const now = new Date();
    if (exam.startsAt && now < exam.startsAt) {
      throw new ForbiddenException('Exam not started');
    }
    if (exam.endsAt && now > exam.endsAt) {
      throw new ForbiddenException('Exam ended');
    }

    const latest = await this.prisma.examAttempt.findFirst({
      where: { examId, userId: user.sub },
      orderBy: [{ attemptNo: 'desc' }, { id: 'desc' }],
      include: { details: true },
    });
    if (latest?.status === AttemptStatus.IN_PROGRESS) {
      return this.ensureAttemptDetails(latest.id);
    }

    const attemptCount = await this.prisma.examAttempt.count({ where: { examId, userId: user.sub } });
    if (exam.maxAttempts && attemptCount >= exam.maxAttempts) {
      throw new ForbiddenException('No attempt quota left');
    }

    const created = await this.prisma.examAttempt.create({
      data: {
        examId,
        userId: user.sub,
        attemptNo: attemptCount + 1,
        details: { create: exam.examQuestions.map((item) => ({ questionId: item.questionId })) },
      },
      include: { details: true },
    });
    return created;
  }

  async detail(attemptId: number, userId: number, role: 'ADMIN' | 'STUDENT') {
    const attempt = await this.ensureAttemptDetails(attemptId);
    if (!attempt || (role !== 'ADMIN' && attempt.userId !== userId)) {
      throw new ForbiddenException('No permission');
    }

    const liveDurationSeconds =
      attempt.status === AttemptStatus.IN_PROGRESS
        ? Math.max(0, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000))
        : (attempt.durationSeconds ?? 0);

    return {
      ...attempt,
      durationSeconds: liveDurationSeconds,
      details: attempt.details.map((detail) => ({
        ...detail,
        question:
          role === 'ADMIN'
            ? detail.question
            : {
                ...detail.question,
                answer: '',
              },
      })),
    };
  }

  async questionNav(attemptId: number, userId: number, role: 'ADMIN' | 'STUDENT') {
    const attempt = await this.detail(attemptId, userId, role);
    return {
      attemptId: attempt.id,
      items: attempt.details.map((detail) => ({
        questionId: detail.questionId,
        answered: Boolean(detail.answer),
        isCorrect: detail.isCorrect,
      })),
    };
  }

  async saveAnswer(attemptId: number, questionId: number, userId: number, answer: string) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== userId) {
      throw new ForbiddenException('No permission');
    }
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Attempt already finished');
    }

    const detail = await this.prisma.examRecordDetail.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { answer, savedAt: new Date() },
      create: { attemptId, questionId, answer },
    });
    await this.prisma.examAttempt.update({ where: { id: attemptId }, data: { lastSavedAt: new Date() } });
    return detail;
  }

  async submit(attemptId: number, userId: number, forced = false, forcedReason?: string) {
    const attempt = await this.ensureAttemptDetails(attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw new ForbiddenException('No permission');
    }
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return attempt;
    }

    let total = 0;
    for (const detail of attempt.details) {
      const expected = this.normalizeAnswer(detail.question.answer);
      const actual = this.normalizeAnswer(detail.answer ?? '');
      const isCorrect = expected === actual;
      const questionConfig = attempt.exam.examQuestions.find((item) => item.questionId === detail.questionId);
      const fullScore = questionConfig?.scoreOverride ?? detail.question.score;
      const score = isCorrect ? fullScore : 0;
      total += score;
      await this.prisma.examRecordDetail.update({
        where: { attemptId_questionId: { attemptId, questionId: detail.questionId } },
        data: { isCorrect, score },
      });
    }

    return this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: forced ? AttemptStatus.FORCED_SUBMITTED : AttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        score: total,
        durationSeconds: Math.max(0, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000)),
        forcedSubmitReason: forced ? forcedReason ?? 'anti-cheat' : null,
      },
    });
  }

  async result(attemptId: number, userId: number, role: 'ADMIN' | 'STUDENT') {
    const attempt = await this.ensureAttemptDetails(attemptId);
    if (!attempt || (role !== 'ADMIN' && attempt.userId !== userId)) {
      throw new ForbiddenException('No permission');
    }

    const totalScore = this.examTotalScore(attempt.exam.examQuestions);
    const wrongCount = attempt.details.filter((detail) => detail.isCorrect === false).length;
    const passed = (attempt.score ?? 0) >= attempt.exam.passScore;
    const resultAvailable = role === 'ADMIN' || this.canStudentViewResult(attempt.exam, attempt.status);
    const latestRejoinRequest =
      role === 'STUDENT'
        ? await this.prisma.examRejoinRequest.findFirst({
            where: { attemptId, studentId: userId },
            include: {
              reviewer: { select: { id: true, username: true, displayName: true } },
            },
            orderBy: { id: 'desc' },
          })
        : null;

    if (!resultAvailable) {
      return {
        attemptId: attempt.id,
        examId: attempt.examId,
        examTitle: attempt.exam.title,
        status: attempt.status,
        showResultMode: attempt.exam.showResultMode,
        resultAvailable: false,
        message:
          attempt.status === AttemptStatus.IN_PROGRESS
            ? '考试尚未交卷，暂不可查看结果。'
            : '该考试设置为手动公布成绩，请等待管理员公布。',
        score: attempt.score ?? 0,
        totalScore,
        passScore: attempt.exam.passScore,
        wrongCount,
        rejoinRequest: latestRejoinRequest
          ? {
              id: latestRejoinRequest.id,
              status: latestRejoinRequest.status,
              reason: latestRejoinRequest.reason,
              reviewNote: latestRejoinRequest.reviewNote,
              reviewedAt: latestRejoinRequest.reviewedAt,
              createdAt: latestRejoinRequest.createdAt,
              reviewer: latestRejoinRequest.reviewer,
            }
          : null,
      };
    }

    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: attempt.exam.title,
      status: attempt.status,
      showResultMode: attempt.exam.showResultMode,
      resultAvailable: true,
      score: attempt.score ?? 0,
      totalScore,
      passScore: attempt.exam.passScore,
      wrongCount,
      passed,
      submittedAt: attempt.submittedAt,
      startedAt: attempt.startedAt,
      durationSeconds: attempt.durationSeconds ?? 0,
      rejoinRequest: latestRejoinRequest
        ? {
            id: latestRejoinRequest.id,
            status: latestRejoinRequest.status,
            reason: latestRejoinRequest.reason,
            reviewNote: latestRejoinRequest.reviewNote,
            reviewedAt: latestRejoinRequest.reviewedAt,
            createdAt: latestRejoinRequest.createdAt,
            reviewer: latestRejoinRequest.reviewer,
          }
        : null,
      questions: attempt.details.map((detail) => {
        const config = attempt.exam.examQuestions.find((item) => item.questionId === detail.questionId);
        return {
          questionId: detail.questionId,
          type: detail.question.type,
          content: detail.question.content,
          options: detail.question.options,
          myAnswer: detail.answer ?? '',
          answer: detail.question.answer,
          analysis: detail.question.analysis ?? '',
          isCorrect: detail.isCorrect ?? false,
          score: detail.score ?? 0,
          fullScore: config?.scoreOverride ?? detail.question.score,
        };
      }),
    };
  }

  async myExams(user: JwtUser) {
    const [publishedExams, attempts] = await Promise.all([
      this.prisma.exam.findMany({
        where: { status: ExamStatus.PUBLISHED },
        include: { examQuestions: true },
        orderBy: { id: 'desc' },
      }),
      this.prisma.examAttempt.findMany({
        where: { userId: user.sub },
        include: {
          exam: { include: { examQuestions: true } },
          details: { include: { question: true } },
        },
        orderBy: [{ id: 'desc' }],
      }),
    ]);

    const attemptsByExam = new Map<number, typeof attempts>();
    for (const attempt of attempts) {
      const current = attemptsByExam.get(attempt.examId) ?? [];
      current.push(attempt);
      attemptsByExam.set(attempt.examId, current);
    }

    const available = publishedExams
      .filter((exam) => this.examAccessibleForUser(exam, user))
      .map((exam) => {
        const examAttempts = attemptsByExam.get(exam.id) ?? [];
        const latestAttempt = examAttempts[0] ?? null;
        const display = this.resolveDisplay(exam, examAttempts);
        const status = display.inProgress ? 'ONGOING' : display.startReady ? (display.notEnded ? 'READY' : 'FINISHED') : 'UPCOMING';

        return {
          examId: exam.id,
          title: exam.title,
          durationMinutes: exam.durationMinutes,
          startsAt: exam.startsAt,
          endsAt: exam.endsAt,
          questionCount: exam.examQuestions.length,
          canStart: display.canStart,
          status,
          displayStatus: display.displayStatus,
          cta: display.cta,
          ctaAttemptId: display.ctaAttemptId,
          attemptId: display.inProgress?.id ?? latestAttempt?.id ?? null,
          score: latestAttempt?.score ?? null,
          totalScore: this.examTotalScore(exam.examQuestions),
          passScore: exam.passScore,
          remainingAttempts: display.remainingAttempts,
          maxAttempts: exam.maxAttempts,
        };
      });

    const availabilityByExam = new Map(available.map((item) => [item.examId, item]));
    const latestAttemptIdByExam = new Map<number, number>();
    for (const [examId, examAttempts] of attemptsByExam.entries()) {
      const latest = examAttempts[0];
      if (latest) {
        latestAttemptIdByExam.set(examId, latest.id);
      }
    }

    const history = attempts.map((attempt) => {
      const examMeta = availabilityByExam.get(attempt.examId);
      const isLatest = latestAttemptIdByExam.get(attempt.examId) === attempt.id;
      const canRetake = Boolean(examMeta?.canStart) && isLatest;
      const canViewResult = this.canStudentViewResult(attempt.exam, attempt.status);
      return {
        attemptId: attempt.id,
        examId: attempt.examId,
        title: attempt.exam.title,
        status: attempt.status,
        score: attempt.score,
        totalScore: this.examTotalScore(attempt.exam.examQuestions),
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        wrongCount: attempt.details.filter((detail) => detail.isCorrect === false).length,
        passScore: attempt.exam.passScore,
        attemptNo: attempt.attemptNo,
        canRetake,
        canViewResult,
        isLatest,
      };
    });

    const grouped = Array.from(
      new Set<number>([
        ...available.map((item) => item.examId),
        ...Array.from(attemptsByExam.keys()),
      ]),
    )
      .map((examId) => {
        const availableExam = availabilityByExam.get(examId);
        const examAttempts = (attemptsByExam.get(examId) ?? []).map((attempt) => {
          const isLatest = latestAttemptIdByExam.get(examId) === attempt.id;
          const canViewResult = this.canStudentViewResult(attempt.exam, attempt.status);
          return {
            attemptId: attempt.id,
            attemptNo: attempt.attemptNo,
            status: attempt.status,
            score: attempt.score,
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            wrongCount: attempt.details.filter((detail) => detail.isCorrect === false).length,
            passScore: attempt.exam.passScore,
            totalScore: this.examTotalScore(attempt.exam.examQuestions),
            canViewResult,
            canRetake: Boolean(availableExam?.canStart) && isLatest,
            isLatest,
          };
        });
        const latestAttempt = examAttempts[0] ?? null;
        const fallbackExam = attemptsByExam.get(examId)?.[0]?.exam;

        return {
          examId,
          title: availableExam?.title ?? fallbackExam?.title ?? `Exam #${examId}`,
          durationMinutes: availableExam?.durationMinutes ?? fallbackExam?.durationMinutes ?? 0,
          startsAt: availableExam?.startsAt ?? fallbackExam?.startsAt ?? null,
          endsAt: availableExam?.endsAt ?? fallbackExam?.endsAt ?? null,
          questionCount: availableExam?.questionCount ?? fallbackExam?.examQuestions.length ?? 0,
          passScore: availableExam?.passScore ?? fallbackExam?.passScore ?? 0,
          totalScore:
            availableExam?.totalScore
            ?? (fallbackExam ? this.examTotalScore(fallbackExam.examQuestions) : 0),
          latestAttempt,
          finalScore: latestAttempt?.score ?? null,
          canRetake: Boolean(latestAttempt?.canRetake),
          attempts: examAttempts,
        };
      })
      .sort((a, b) => b.examId - a.examId);

    return { available, history, grouped };
  }

  async myExamRecords(user: JwtUser, examId: number) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { examQuestions: true },
    });
    if (!exam || !this.examAccessibleForUser(exam, user)) {
      throw new ForbiddenException('No permission');
    }
    const attempts = await this.prisma.examAttempt.findMany({
      where: { userId: user.sub, examId },
      include: { details: true },
      orderBy: [{ attemptNo: 'desc' }, { id: 'desc' }],
    });
    const totalScore = this.examTotalScore(exam.examQuestions);
    const latestAttemptId = attempts[0]?.id ?? null;
    return {
      examId,
      examTitle: exam.title,
      totalScore,
      passScore: exam.passScore,
      records: attempts.map((attempt) => ({
        attemptId: attempt.id,
        attemptNo: attempt.attemptNo,
        status: attempt.status,
        score: attempt.score ?? 0,
        wrongCount: attempt.details.filter((detail) => detail.isCorrect === false).length,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        canViewResult: this.canStudentViewResult(exam, attempt.status),
        isLatest: latestAttemptId === attempt.id,
      })),
    };
  }

  async myWrongQuestions(userId: number, attemptId?: number) {
    const attempts = await this.prisma.examAttempt.findMany({
      where: {
        userId,
        ...(attemptId ? { id: attemptId } : {}),
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.FORCED_SUBMITTED] },
      },
      include: {
        exam: true,
        details: { include: { question: true } },
      },
      orderBy: { id: 'desc' },
    });

    const rows: Array<Record<string, unknown>> = [];
    for (const attempt of attempts) {
      for (const detail of attempt.details) {
        if (detail.isCorrect === false) {
          rows.push(this.toWrongQuestionRow(attempt.id, attempt.examId, attempt.exam.title, detail));
        }
      }
    }
    return rows;
  }

  async studentDashboard(user: JwtUser) {
    const attempts = await this.prisma.examAttempt.findMany({
      where: { userId: user.sub },
      orderBy: [{ id: 'desc' }],
      include: {
        exam: { include: { examQuestions: true } },
      },
    });

    const latestAttempt = attempts[0] ?? null;
    const submittedAttempts = attempts.filter((item) => item.status !== AttemptStatus.IN_PROGRESS);
    const passedCount = submittedAttempts.filter((item) => (item.score ?? 0) >= item.exam.passScore).length;
    const passRate = submittedAttempts.length > 0 ? passedCount / submittedAttempts.length : 0;
    const pendingRejoinCount = await this.prisma.examRejoinRequest.count({
      where: { studentId: user.sub, status: 'PENDING' },
    });
    const inProgressAttempt = attempts.find((item) => item.status === AttemptStatus.IN_PROGRESS) ?? null;

    return {
      summary: {
        totalAttempts: attempts.length,
        latestScore: latestAttempt?.score ?? null,
        latestStatus: latestAttempt?.status ?? null,
        passRate,
        pendingRejoinCount,
      },
      latestAttempt: latestAttempt
        ? {
            attemptId: latestAttempt.id,
            examId: latestAttempt.examId,
            examTitle: latestAttempt.exam.title,
            score: latestAttempt.score,
            status: latestAttempt.status,
            submittedAt: latestAttempt.submittedAt,
            totalScore: this.examTotalScore(latestAttempt.exam.examQuestions),
          }
        : null,
      shortcuts: {
        continueAttempt: inProgressAttempt
          ? {
              attemptId: inProgressAttempt.id,
              examId: inProgressAttempt.examId,
              examTitle: inProgressAttempt.exam.title,
            }
          : null,
      },
    };
  }

  async antiCheatLogs(params: {
    page: number;
    pageSize: number;
    keyword?: string;
    examId?: number;
    eventType?: string;
  }) {
    const page = Math.max(params.page || 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize || 20, 1), 100);
    const where = {
      ...(params.eventType ? { eventType: params.eventType } : {}),
      ...(params.examId || params.keyword
        ? {
            attempt: {
              ...(params.examId ? { examId: params.examId } : {}),
              ...(params.keyword
                ? {
                    user: {
                      OR: [
                        { username: { contains: params.keyword } },
                        { displayName: { contains: params.keyword } },
                      ],
                    },
                  }
                : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.antiCheatEvent.count({ where }),
      this.prisma.antiCheatEvent.findMany({
        where,
        orderBy: [{ id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          attempt: {
            include: {
              exam: { select: { id: true, title: true } },
              user: { select: { id: true, username: true, displayName: true } },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      rows: rows.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        eventType: item.eventType,
        message: item.message,
        attemptId: item.attemptId,
        examId: item.attempt.examId,
        examTitle: item.attempt.exam.title,
        userId: item.attempt.userId,
        username: item.attempt.user.username,
        displayName: item.attempt.user.displayName,
        attemptStatus: item.attempt.status,
        forcedSubmitted: item.attempt.status === AttemptStatus.FORCED_SUBMITTED,
      })),
    };
  }

  async antiCheatEvent(attemptId: number, userId: number, eventType: string, message?: string) {
    const attempt = await this.prisma.examAttempt.findUnique({ where: { id: attemptId }, include: { exam: true } });
    if (!attempt || attempt.userId !== userId) {
      throw new ForbiddenException('No permission');
    }
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return { forcedSubmit: false, antiCheatViolationCount: attempt.antiCheatViolationCount };
    }

    const updated = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        antiCheatViolationCount: { increment: 1 },
        antiCheatEvents: { create: { eventType, message } },
      },
      include: { exam: true },
    });

    if (updated.exam.antiCheatEnabled && updated.antiCheatViolationCount >= updated.exam.antiCheatThreshold) {
      await this.submit(attemptId, userId, true, eventType);
      return { forcedSubmit: true, antiCheatViolationCount: updated.antiCheatViolationCount };
    }
    return { forcedSubmit: false, antiCheatViolationCount: updated.antiCheatViolationCount };
  }

  private toWrongQuestionRow(
    attemptId: number,
    examId: number,
    examTitle: string,
    detail: ExamRecordDetail & { question: Question },
  ) {
    return {
      attemptId,
      examId,
      examTitle,
      questionId: detail.questionId,
      questionType: detail.question.type,
      content: detail.question.content,
      options: detail.question.options,
      analysis: detail.question.analysis,
      myAnswer: detail.answer,
      answer: detail.question.answer,
      score: detail.score ?? 0,
      fullScore: detail.question.score,
    };
  }
}
